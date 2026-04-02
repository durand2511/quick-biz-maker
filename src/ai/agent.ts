/**
 * Agent — The main orchestrator that coordinates planner, builder, and critic.
 *
 * Flow: User input → Chat AI (intent) → Planner → Builder → Critic → Output
 *
 * The agent runs as an async pipeline, calling each module in sequence
 * and making decisions based on intermediate results.
 */

import { callChatAI, type ChatMessage } from "@/api/ai";
import { createPlan } from "./planner";
import { buildFromPlan, buildDirect } from "./builder";
import { analyzeApp, type CriticResult } from "./critic";
import type { AppPlan } from "./componentMap";
import type { QuickEdit } from "@/lib/aiStream";

export type AgentPhase =
  | "idle"
  | "understanding"
  | "planning"
  | "building"
  | "reviewing"
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
  maxFixCycles: 1,
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

    // ── Phase 2: Build ──
    callbacks.onPhaseChange("building", "App genereren...");

    let generatedHtml = "";

    await buildDirect(
      [
        ...messages.filter((m) => m.role === "user"),
        { role: "user", content: input },
      ],
      currentHtml,
      {
        onDelta: callbacks.onHtmlDelta,
        onDone: (html) => {
          generatedHtml = html;
        },
        onError: (err) => {
          callbacks.onError(err);
        },
      },
    );

    if (!generatedHtml || (!generatedHtml.includes("<html") && !generatedHtml.includes("<!DOCTYPE"))) {
      callbacks.onError("Generatie mislukt: geen geldige HTML ontvangen");
      callbacks.onPhaseChange("error");
      return;
    }

    // ── Phase 3: Critic review ──
    const isUpdate = hasExistingApp;
    if (cfg.skipCriticForUpdates && isUpdate) {
      callbacks.onHtmlComplete(generatedHtml);
      callbacks.onPhaseChange("done", "Wijziging toegepast!");
      return;
    }

    callbacks.onPhaseChange("reviewing", "Kwaliteit controleren...");

    let currentResult = generatedHtml;
    let fixCycle = 0;

    while (fixCycle < cfg.maxFixCycles) {
      const criticResult = await analyzeApp(currentResult, input);
      callbacks.onCriticResult(criticResult);

      if (criticResult.passed || !criticResult.shouldFix) {
        break;
      }

      // ── Phase 4: Auto-fix ──
      fixCycle++;
      callbacks.onPhaseChange("fixing", `Verbeteringen toepassen (ronde ${fixCycle})...`);

      const fixPrompt = criticResult.issues
        .filter((i) => i.severity === "critical")
        .map((i) => `Fix: ${i.fix}`)
        .join("\n");

      if (!fixPrompt) break;

      let fixedHtml = "";
      await buildDirect(
        [
          { role: "user", content: input },
          {
            role: "user",
            content: `Fix deze problemen in de huidige app:\n${fixPrompt}`,
          },
        ],
        currentResult,
        {
          onDelta: callbacks.onHtmlDelta,
          onDone: (html) => {
            fixedHtml = html;
          },
          onError: () => {
            // If fix fails, use the original
          },
        },
      );

      if (fixedHtml && (fixedHtml.includes("<html") || fixedHtml.includes("<!DOCTYPE"))) {
        currentResult = fixedHtml;
      } else {
        break;
      }
    }

    callbacks.onHtmlComplete(currentResult);
    callbacks.onPhaseChange("done", "Klaar!");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onbekende fout";
    callbacks.onError(message);
    callbacks.onPhaseChange("error", message);
  }
}
