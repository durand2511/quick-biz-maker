/**
 * Agent — The main orchestrator that coordinates all modules.
 *
 * Flow: User input → Understand → Plan → Backend → Build → Test → Critic → Fix (×3) → Output
 *
 * Uses AgentState to track progress across all phases.
 */

import { callChatAI, type ChatMessage } from "@/api/ai";
import { createPlan } from "./planner";
import { buildFromPlan, buildDirect } from "./builder";
import { generateBackend, backendToPromptHint } from "./backend";
import { runTests, getTestSummary } from "./tester";
import { analyzeApp, type CriticResult } from "./critic";
import { editApp, classifyEdit } from "./editor";
import {
  createAgentState,
  updatePlan,
  updateHtml,
  addTests,
  addCriticResults,
  addError,
  hasImproved,
  getStateSummary,
  type AgentState,
} from "./state";
import type { AppPlan } from "./componentMap";
import type { QuickEdit } from "@/lib/aiStream";

export type AgentPhase =
  | "idle"
  | "understanding"
  | "planning"
  | "building"
  | "reviewing"
  | "testing"
  | "fixing"
  | "done"
  | "error";

export interface AgentCallbacks {
  onPhaseChange: (phase: AgentPhase, message?: string) => void;
  onHtmlDelta: (chunk: string) => void;
  onHtmlComplete: (html: string) => void;
  onChatResponse: (message: string, title: string) => void;
  onQuickEdits: (edits: QuickEdit[]) => void;
  onPlanReady: (plan: AppPlan) => void;
  onCriticResult: (result: CriticResult) => void;
  onStateUpdate: (state: AgentState) => void;
  onError: (error: string) => void;
}

export interface AgentConfig {
  /** Maximum number of critic → fix cycles */
  maxFixCycles: number;
  /** Skip the critic step for simple updates */
  skipCriticForUpdates: boolean;
  /** Minimum critic score to pass */
  minScore: number;
}

const DEFAULT_CONFIG: AgentConfig = {
  maxFixCycles: 3,
  skipCriticForUpdates: true,
  minScore: 60,
};

/**
 * Run the full agent pipeline for a user request.
 */
export async function runAgent(
  input: string,
  messages: ChatMessage[],
  currentHtml: string | null,
  callbacks: AgentCallbacks,
  config: Partial<AgentConfig> = {},
): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const hasExistingApp = !!currentHtml;
  let state = createAgentState(input, currentHtml);

  const emitState = () => callbacks.onStateUpdate?.(state);

  try {
    // ── Phase 1: Understand intent ──
    callbacks.onPhaseChange("understanding", "Verzoek analyseren...");

    const chatResult = await callChatAI(messages, hasExistingApp);
    callbacks.onChatResponse(chatResult.message, chatResult.title);

    // Handle quick edits (instant, no build needed)
    if (chatResult.quickEdits && chatResult.quickEdits.length > 0 && currentHtml) {
      callbacks.onQuickEdits(chatResult.quickEdits as QuickEdit[]);
      callbacks.onPhaseChange("done", "Direct toegepast!");
      return;
    }

    // If chat AI says no build needed, we're done
    if (!chatResult.shouldBuild) {
      callbacks.onPhaseChange("done");
      return;
    }

    // ── Phase 2: Build (with backend hints if new app) ──
    callbacks.onPhaseChange("building", "App genereren...");

    // For new apps, generate backend structure for richer prompts
    if (!hasExistingApp) {
      // Quick plan inference for backend generation
      try {
        const planResult = await createPlan(input, false);
        state = updatePlan(state, planResult.plan);
        callbacks.onPlanReady(planResult.plan);

        const backend = generateBackend(state);
        const backendHint = backendToPromptHint(backend);

        // Build with enriched prompt
        let generatedHtml = "";
        const enrichedMessages: ChatMessage[] = [
          ...messages.filter((m) => m.role === "user"),
          {
            role: "user",
            content: backendHint
              ? `${input}\n\n=== BACKEND STRUCTUUR ===\n${backendHint}`
              : input,
          },
        ];

        await buildDirect(enrichedMessages, null, {
          onDelta: callbacks.onHtmlDelta,
          onDone: (html) => { generatedHtml = html; },
          onError: (err) => {
            state = addError(state, err);
            callbacks.onError(err);
          },
        });

        if (!generatedHtml || (!generatedHtml.includes("<html") && !generatedHtml.includes("<!DOCTYPE"))) {
          callbacks.onError("Generatie mislukt: geen geldige HTML ontvangen");
          callbacks.onPhaseChange("error");
          return;
        }

        state = updateHtml(state, generatedHtml);
        emitState();
      } catch {
        // Fallback: build without plan
        let generatedHtml = "";
        await buildDirect(
          [...messages.filter((m) => m.role === "user"), { role: "user", content: input }],
          null,
          {
            onDelta: callbacks.onHtmlDelta,
            onDone: (html) => { generatedHtml = html; },
            onError: (err) => { state = addError(state, err); callbacks.onError(err); },
          },
        );

        if (!generatedHtml || (!generatedHtml.includes("<html") && !generatedHtml.includes("<!DOCTYPE"))) {
          callbacks.onError("Generatie mislukt");
          callbacks.onPhaseChange("error");
          return;
        }

        state = updateHtml(state, generatedHtml);
        emitState();
      }
    } else {
      // Edit mode: use editor module
      let generatedHtml = "";
      await editApp(
        {
          prompt: input,
          currentHtml: currentHtml!,
          conversationHistory: messages,
        },
        {
          onDelta: callbacks.onHtmlDelta,
          onDone: (html) => { generatedHtml = html; },
          onError: (err) => { state = addError(state, err); callbacks.onError(err); },
        },
      );

      if (!generatedHtml || (!generatedHtml.includes("<html") && !generatedHtml.includes("<!DOCTYPE"))) {
        callbacks.onError("Wijziging mislukt");
        callbacks.onPhaseChange("error");
        return;
      }

      state = updateHtml(state, generatedHtml);
      emitState();

      // Skip critic for quick edits
      if (cfg.skipCriticForUpdates && classifyEdit(input) === "quick") {
        callbacks.onHtmlComplete(state.html!);
        callbacks.onPhaseChange("done", "Wijziging toegepast!");
        return;
      }
    }

    // ── Phase 3: Test ──
    callbacks.onPhaseChange("testing", "App testen...");
    const testResults = runTests(state);
    state = addTests(state, testResults);
    const testSummary = getTestSummary(testResults);
    emitState();

    // ── Phase 4: Critic + Fix loop (up to maxFixCycles) ──
    let fixCycle = 0;

    while (fixCycle < cfg.maxFixCycles) {
      callbacks.onPhaseChange("reviewing", `Kwaliteit controleren (ronde ${fixCycle + 1}/${cfg.maxFixCycles})...`);

      const criticResult = await analyzeApp(state.html!, input);
      callbacks.onCriticResult(criticResult);
      state = addCriticResults(state, criticResult.score, criticResult.issues);
      emitState();

      // Check if we pass or if no improvement is being made
      if (criticResult.passed || !criticResult.shouldFix) {
        break;
      }

      // Stop if not improving
      if (fixCycle > 0 && !hasImproved(state)) {
        break;
      }

      // ── Auto-fix ──
      fixCycle++;
      callbacks.onPhaseChange("fixing", `Verbeteringen toepassen (ronde ${fixCycle})...`);

      const fixPrompts: string[] = [];

      // Add critic fixes
      const criticalFixes = criticResult.issues
        .filter((i) => i.severity === "critical")
        .map((i) => i.fix);
      fixPrompts.push(...criticalFixes);

      // Add failed test fixes
      const failedTests = testResults
        .filter((t) => !t.passed)
        .slice(0, 3)
        .map((t) => `Fix: ${t.description}`);
      fixPrompts.push(...failedTests);

      if (fixPrompts.length === 0) break;

      const fixPrompt = fixPrompts.join("\n");
      let fixedHtml = "";

      await buildDirect(
        [
          { role: "user", content: input },
          { role: "user", content: `Fix deze problemen in de huidige app:\n${fixPrompt}` },
        ],
        state.html!,
        {
          onDelta: callbacks.onHtmlDelta,
          onDone: (html) => { fixedHtml = html; },
          onError: () => { /* use original on failure */ },
        },
      );

      if (fixedHtml && (fixedHtml.includes("<html") || fixedHtml.includes("<!DOCTYPE"))) {
        state = updateHtml(state, fixedHtml);
        // Re-run tests after fix
        const newTests = runTests(state);
        state = addTests(state, newTests);
        emitState();
      } else {
        break;
      }
    }

    // ── Done ──
    callbacks.onHtmlComplete(state.html!);
    state.timestamps.done = Date.now();

    const summary = getStateSummary(state);
    console.log("Agent complete:", summary);

    callbacks.onPhaseChange("done", "Klaar!");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout";
    state = addError(state, message);
    callbacks.onError(message);
    callbacks.onPhaseChange("error", message);
  }
}
