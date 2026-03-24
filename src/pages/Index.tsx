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
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: isSameHtml
                  ? `Ik heb je verzoek verwerkt, maar de output bleef vrijwel gelijk.\n\n✓ Wat ik heb gecontroleerd\n• Je laatste wijziging: "${input}"\n• De huidige app als basis voor de update\n• De preview opnieuw opgebouwd\n\nGeef je wijziging iets concreter, bijvoorbeeld: "voeg onder de hero een contactformulier toe" of "maak de boekingsknop blauw en laat hem scrollen naar boeken".`
                  : mode === "update"
                    ? `Klaar — ik heb je app bijgewerkt.\n\n✓ Wat ik heb gedaan\n• Je laatste verzoek uitgevoerd: "${input}"\n• Alleen de relevante delen aangepast in plaats van alles opnieuw te maken\n• De live preview vernieuwd met de nieuwe versie\n\n✓ Hoe ik dit heb gedaan\n• Eerst de bestaande HTML als basis genomen\n• Daarna je wijziging gericht in de code verwerkt\n• Tot slot gecontroleerd of de nieuwe output geldig is voor de preview`
                    : `Klaar — ik heb een eerste versie van je app gemaakt.\n\n✓ Wat ik heb gedaan\n• Je idee omgezet naar een werkende eerste app\n• Een volledige HTML-pagina opgebouwd met inhoud en structuur\n• De live preview direct gevuld zodat je meteen kunt itereren\n\n✓ Hoe ik dit heb gedaan\n• Je beschrijving vertaald naar secties, knoppen en flow\n• De basisfunctionaliteit in de gegenereerde app gezet\n• Alles direct klaargezet voor je volgende wijziging`,
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
