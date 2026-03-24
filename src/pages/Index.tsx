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
};

const BUILD_PHASES: BuildStatus[] = [
  { phase: "analyzing", detail: "Ik lees je prompt en bepaal welke onderdelen nodig zijn...", progress: 10 },
  { phase: "planning", detail: "Ik vergelijk dit met de huidige app en plan de wijzigingen...", progress: 25 },
  { phase: "generating", detail: "Ik schrijf de nieuwe HTML-structuur en inhoud...", progress: 40 },
  { phase: "components", detail: "Ik bouw secties, knoppen, formulieren en navigatie...", progress: 60 },
  { phase: "styling", detail: "Ik werk styling, spacing en responsive gedrag bij...", progress: 75 },
  { phase: "interactivity", detail: "Ik voeg logica toe voor interacties en gebruiksflow...", progress: 85 },
  { phase: "finalizing", detail: "Ik controleer de output en maak de preview klaar...", progress: 95 },
];

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

  const startBuildProgress = () => {
    if (phaseTimerRef.current) {
      clearInterval(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }

    phaseIndexRef.current = 0;
    setBuildStatus(BUILD_PHASES[0]);

    phaseTimerRef.current = setInterval(() => {
      phaseIndexRef.current += 1;
      if (phaseIndexRef.current < BUILD_PHASES.length) {
        setBuildStatus(BUILD_PHASES[phaseIndexRef.current]);
      } else {
        if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
      }
    }, 2500);
  };

  const stopBuildProgress = () => {
    if (phaseTimerRef.current) {
      clearInterval(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
    setBuildStatus({ phase: "done", detail: "Klaar! ✅", progress: 100 });
    setTimeout(() => setBuildStatus(null), 2000);
  };

  const handleSend = async (input: string) => {
    if (!hasStarted) setHasStarted(true);

    const userMsg: ChatMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMsg];
    const conversationForAi = updatedMessages.filter((message) => message.role === "user");
    setMessages(updatedMessages);
    setIsLoading(true);
    startBuildProgress();

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
                  ? `Ik heb je verzoek verwerkt, maar de output bleef vrijwel gelijk. Geef iets specifieker aan wat anders moet.`
                  : generatedHtml
                    ? `Klaar — ik heb de app bijgewerkt op basis van je laatste verzoek: "${input}".`
                    : `Klaar — ik heb een eerste werkende versie gemaakt op basis van: "${input}".`,
              },
            ]);
          } else {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: fullResponse },
            ]);
          }
          setIsLoading(false);
          stopBuildProgress();
        },
        onError: (error) => {
          toast.error(error);
          setIsLoading(false);
          stopBuildProgress();
        },
      });
    } catch {
      toast.error("Generatie mislukt. Probeer het opnieuw.");
      setIsLoading(false);
      stopBuildProgress();
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
