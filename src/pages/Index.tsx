import { useState, useRef, useEffect } from "react";
import { Wand2 } from "lucide-react";
import ChatInput from "@/components/ChatInput";
import ChatMessages from "@/components/ChatMessages";
import LivePreview from "@/components/LivePreview";
import WelcomeScreen from "@/components/WelcomeScreen";
import { streamGenerateApp, type ChatMessage } from "@/lib/aiStream";
import { toast } from "sonner";

export type BuildStatus = {
  phase: string;
  detail: string;
  progress: number;
  mode: "create" | "update";
  latestPrompt: string;
  steps: {
    phase: string;
    label: string;
    detail: string;
    status: "pending" | "active" | "done";
  }[];
};

const BUILD_PHASE_VARIANTS = [
  [
    { phase: "analyzing", label: "Verzoek begrijpen", detail: "Even kijken wat je precies wilt…", progress: 12 },
    { phase: "planning", label: "Wijzigingen plannen", detail: "Ik vergelijk je verzoek met de huidige versie.", progress: 26 },
    { phase: "generating", label: "Code aanpassen", detail: "Bezig met het herschrijven van de structuur.", progress: 44 },
    { phase: "components", label: "Onderdelen bijwerken", detail: "Secties, knoppen en formulieren worden aangepast.", progress: 62 },
    { phase: "styling", label: "Styling verfijnen", detail: "Kleuren, spacing en responsive layout bijwerken.", progress: 78 },
    { phase: "interactivity", label: "Interactie checken", detail: "Controleren of alles klikt, scrollt en werkt.", progress: 90 },
    { phase: "finalizing", label: "Preview laden", detail: "Laatste check — bijna klaar!", progress: 96 },
  ],
  [
    { phase: "analyzing", label: "Opdracht lezen", detail: "Ik snap wat je bedoelt, momentje…", progress: 12 },
    { phase: "planning", label: "Strategie bepalen", detail: "Ik bepaal de slimste manier om dit aan te pakken.", progress: 26 },
    { phase: "generating", label: "HTML genereren", detail: "De code wordt nu opgebouwd.", progress: 44 },
    { phase: "components", label: "Componenten plaatsen", detail: "Formulieren, navigatie en content komen op hun plek.", progress: 62 },
    { phase: "styling", label: "Design polijsten", detail: "Het visuele ontwerp wordt afgewerkt.", progress: 78 },
    { phase: "interactivity", label: "Functionaliteit testen", detail: "Ik test of alles goed samenwerkt.", progress: 90 },
    { phase: "finalizing", label: "Afronden", detail: "De preview wordt vernieuwd met je wijzigingen.", progress: 96 },
  ],
  [
    { phase: "analyzing", label: "Input verwerken", detail: "Ik lees je bericht en pak de kern eruit.", progress: 12 },
    { phase: "planning", label: "Aanpak kiezen", detail: "Even uitzoeken wat de beste route is.", progress: 26 },
    { phase: "generating", label: "Code schrijven", detail: "De nieuwe versie wordt nu geschreven.", progress: 44 },
    { phase: "components", label: "Elementen bouwen", detail: "Alle onderdelen worden ingepast.", progress: 62 },
    { phase: "styling", label: "Look & feel", detail: "Kleuren en typografie worden afgesteld.", progress: 78 },
    { phase: "interactivity", label: "Werking valideren", detail: "Knoppen, links en formulieren worden gecheckt.", progress: 90 },
    { phase: "finalizing", label: "Klaar maken", detail: "Nog even de puntjes op de i…", progress: 96 },
  ],
];

const pickBuildPhases = () => BUILD_PHASE_VARIANTS[Math.floor(Math.random() * BUILD_PHASE_VARIANTS.length)];

let BUILD_PHASES = pickBuildPhases();

const createBuildStatus = (
  activeIndex: number,
  latestPrompt: string,
  mode: "create" | "update",
  done = false,
): BuildStatus => ({
  phase: done ? "done" : BUILD_PHASES[Math.min(activeIndex, BUILD_PHASES.length - 1)].phase,
  detail: done
    ? mode === "update"
      ? "Klaar — je app is bijgewerkt en de preview is vernieuwd."
      : "Klaar — je eerste versie staat live in de preview."
    : BUILD_PHASES[Math.min(activeIndex, BUILD_PHASES.length - 1)].detail,
  progress: done ? 100 : BUILD_PHASES[Math.min(activeIndex, BUILD_PHASES.length - 1)].progress,
  mode,
  latestPrompt,
  steps: BUILD_PHASES.map((step, index) => ({
    phase: step.phase,
    label: step.label,
    detail: step.detail,
    status: done || index < activeIndex ? "done" : index === activeIndex ? "active" : "pending",
  })),
});

const Index = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [buildStatus, setBuildStatus] = useState<BuildStatus | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const phaseIndexRef = useRef(0);
  const phaseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
    };
  }, []);

  const startBuildProgress = (latestPrompt: string, mode: "create" | "update") => {
    if (phaseTimerRef.current) {
      clearInterval(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }

    phaseIndexRef.current = 0;
    setBuildStatus(createBuildStatus(0, latestPrompt, mode));

    phaseTimerRef.current = setInterval(() => {
      phaseIndexRef.current += 1;
      if (phaseIndexRef.current < BUILD_PHASES.length) {
        setBuildStatus(createBuildStatus(phaseIndexRef.current, latestPrompt, mode));
      } else {
        if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
      }
    }, 2500);
  };

  const stopBuildProgress = (latestPrompt: string, mode: "create" | "update") => {
    if (phaseTimerRef.current) {
      clearInterval(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
    setBuildStatus(createBuildStatus(BUILD_PHASES.length - 1, latestPrompt, mode, true));
    setTimeout(() => setBuildStatus(null), 2000);
  };

  const handleSend = async (input: string) => {
    if (!hasStarted) setHasStarted(true);

    const mode = generatedHtml ? "update" : "create";

    const userMsg: ChatMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMsg];
    const conversationForAi: ChatMessage[] = generatedHtml
      ? [{ role: "user", content: `Pas de bestaande app gericht aan op basis van deze laatste wijziging: ${input}` }]
      : [userMsg];

    setMessages(updatedMessages);
    setIsLoading(true);
    startBuildProgress(input, mode);

    let fullResponse = "";

    try {
      await streamGenerateApp({
        messages: conversationForAi,
        currentHtml: generatedHtml,
        onDelta: (chunk) => {
          fullResponse += chunk;
        },
        onDone: () => {
          let html = fullResponse;
          if (html.includes("```html")) {
            html = html.replace(/```html\n?/g, "").replace(/```\n?/g, "");
          }
          html = html.trim();

          if (html.includes("<!DOCTYPE") || html.includes("<html")) {
            const isSameHtml = generatedHtml?.trim() === html;
            setGeneratedHtml(html);

            const sameResponses = [
              `Hmm, ik heb je verzoek verwerkt maar de app ziet er hetzelfde uit.\n\n✓ Gecheckt\n• "${input}" vergeleken met de huidige versie\n• Geen zichtbaar verschil gevonden\n\nProbeer het specifieker, bijv. "maak de achtergrond donkerblauw" of "voeg een FAQ-sectie toe onder services".`,
              `Ik heb ernaar gekeken, maar er veranderde niks merkbaar.\n\n✓ Wat ik deed\n• Je wijziging "${input}" geanalyseerd\n• De bestaande code doorgelopen\n\nTip: wees wat concreter — bijv. "verander de titel naar X" of "voeg een prijstabel toe".`,
            ];

            const updateResponses = [
              `Top, dat is gefixt! 🛠️\n\n✓ Uitgevoerd\n• "${input}" doorgevoerd in de bestaande app\n• Alleen het relevante deel aangepast\n• Preview is bijgewerkt\n\nBekijk het resultaat rechts — laat me weten of je nog iets wilt tweaken.`,
              `Geregeld! ✅\n\n✓ Wat ik heb aangepast\n• Je verzoek "${input}" verwerkt\n• De rest van de app onaangetast gelaten\n• Live preview ververst\n\nKijk even of het klopt, en geef gerust je volgende wijziging door.`,
              `Klaar, de update staat live. 🚀\n\n✓ Gedaan\n• "${input}" is verwerkt in de code\n• Bestaande functionaliteit behouden\n• Preview direct bijgewerkt\n\nWat wil je hierna aanpassen?`,
            ];

            const createResponses = [
              `Je app staat klaar! 🎉\n\n✓ Wat ik heb gebouwd\n• Je idee "${input}" omgezet naar een werkende pagina\n• Navigatie, secties en styling opgezet\n• Preview is direct beschikbaar\n\nJe kunt nu verfijnen — vertel me wat je wilt veranderen.`,
              `Eerste versie is live! ✨\n\n✓ Opgeleverd\n• Complete HTML-pagina gebouwd op basis van "${input}"\n• Professionele opzet met hero, content en footer\n• Klaar om te itereren\n\nWat wil je als eerste aanpassen?`,
              `Nice, hier is je app! 💪\n\n✓ Gebouwd\n• "${input}" vertaald naar een volledige werkende webpagina\n• Responsive design en interactieve elementen inbegrepen\n\nDe preview staat rechts — schiet maar met je eerste feedback.`,
            ];

            const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: isSameHtml
                  ? pick(sameResponses)
                  : mode === "update"
                    ? pick(updateResponses)
                    : pick(createResponses),
              },
            ]);
          } else {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: `Ik kreeg geen geldige app terug van de generator.\n\nOntvangen antwoord:\n${fullResponse}`,
              },
            ]);
          }
          setIsLoading(false);
          stopBuildProgress(input, mode);
        },
        onError: (error) => {
          toast.error(error);
          setIsLoading(false);
          stopBuildProgress(input, mode);
        },
      });
    } catch {
      toast.error("Generatie mislukt. Probeer het opnieuw.");
      setIsLoading(false);
      stopBuildProgress(input, mode);
    }
  };

  if (!hasStarted) {
    return <WelcomeScreen onSend={handleSend} />;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center gap-3 border-b border-border bg-card px-5 py-3 shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
          <Wand2 className="h-4 w-4 text-primary-foreground" />
        </div>
        <h1 className="text-sm font-bold">AppForge</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[380px] flex flex-col border-r border-border shrink-0">
          <ChatMessages messages={messages} isLoading={isLoading} buildStatus={buildStatus} />
          <div ref={messagesEndRef} />
          <ChatInput
            onSend={handleSend}
            isLoading={isLoading}
            placeholder="Beschrijf wijzigingen..."
          />
        </div>

        <LivePreview html={generatedHtml} />
      </div>
    </div>
  );
};

export default Index;
