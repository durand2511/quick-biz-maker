import { useState, useRef, useEffect } from "react";
import { Wand2, Globe, ChevronDown, Home, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatInput from "@/components/ChatInput";
import ChatMessages from "@/components/ChatMessages";
import LivePreview from "@/components/LivePreview";
import WelcomeScreen from "@/components/WelcomeScreen";
import AppSidebar from "@/components/AppSidebar";
import AllProjectsView from "@/components/AllProjectsView";
import PublishPanel from "@/components/PublishPanel";
import { streamGenerateApp, type ChatMessage } from "@/lib/aiStream";
import { createProject, updateProject, type AppProject } from "@/lib/projects";
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

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function generateContextualPhases(prompt: string, mode: "create" | "update") {
  const p = prompt.toLowerCase();
  const hasForm = /formulier|form|contact|mail|bericht/i.test(p);
  const hasBooking = /boek|reserv|afspraak|agenda|planning/i.test(p);
  const hasColor = /kleur|color|blauw|rood|groen|geel|paars|donker|licht|wit|zwart|theme/i.test(p);
  const hasNav = /menu|navigat|header|navbar|links/i.test(p);
  const hasSection = /sectie|section|blok|toevoeg|nieuw|extra/i.test(p);
  const hasImage = /afbeelding|foto|image|logo|icon|plaatje/i.test(p);
  const hasText = /tekst|text|titel|naam|beschrijving|inhoud|content/i.test(p);
  const hasPrice = /prijs|price|tarief|kosten|pakket|pricing/i.test(p);
  const hasFooter = /footer|onderkant|voettekst/i.test(p);
  const hasHero = /hero|banner|kop|header.*groot/i.test(p);
  const hasDownload = /download|pdf|bestand/i.test(p);

  const analyzeLabels = mode === "create"
    ? [
        { label: "Je idee analyseren", detail: `Ik begrijp wat je wilt: "${prompt.slice(0, 60)}…"` },
        { label: "Beschrijving lezen", detail: "Ik verwerk je opdracht en bepaal de opzet." },
      ]
    : [
        { label: "Wijziging begrijpen", detail: `Ik kijk wat er moet veranderen: "${prompt.slice(0, 60)}…"` },
        { label: "Verzoek inlezen", detail: "Ik analyseer je aanpassing en vergelijk met de huidige versie." },
      ];

  const planDetails: string[] = [];
  if (hasForm) planDetails.push("een formulier opzetten");
  if (hasBooking) planDetails.push("het boekingssysteem inrichten");
  if (hasColor) planDetails.push("het kleurenschema aanpassen");
  if (hasNav) planDetails.push("de navigatie bijwerken");
  if (hasSection) planDetails.push("nieuwe secties toevoegen");
  if (hasImage) planDetails.push("afbeeldingen inpassen");
  if (hasPrice) planDetails.push("een prijsoverzicht maken");
  if (hasHero) planDetails.push("de hero-sectie opbouwen");
  if (hasDownload) planDetails.push("downloadfunctionaliteit toevoegen");
  if (hasFooter) planDetails.push("de footer aanpassen");
  if (hasText) planDetails.push("tekst en inhoud bijwerken");
  if (planDetails.length === 0) planDetails.push(mode === "create" ? "de app-structuur bepalen" : "de wijzigingen in kaart brengen");

  const planLabel = mode === "create" ? "Structuur bepalen" : "Aanpak plannen";
  const planDetail = `Ik ga ${planDetails.slice(0, 3).join(", ")}.`;

  const genStep = mode === "create"
    ? pick([
        { label: "App opbouwen", detail: "De volledige pagina wordt nu geschreven." },
        { label: "Code genereren", detail: "HTML, CSS en JavaScript worden opgebouwd." },
      ])
    : pick([
        { label: "Code bijwerken", detail: "Ik pas de bestaande code gericht aan." },
        { label: "Wijzigingen schrijven", detail: "De aanpassingen worden nu in de code verwerkt." },
      ]);

  let compLabel = "Onderdelen plaatsen"; let compDetail = "Alle elementen worden ingepast.";
  if (hasForm) { compLabel = "Formulier bouwen"; compDetail = "Invoervelden, validatie en verzendknop worden toegevoegd."; }
  else if (hasBooking) { compLabel = "Boekingssysteem maken"; compDetail = "Datumkeuze, tijdslots en bevestiging worden ingebouwd."; }
  else if (hasNav) { compLabel = "Navigatie opzetten"; compDetail = "Menu-items en scroll-links worden gemaakt."; }
  else if (hasPrice) { compLabel = "Prijstabel opbouwen"; compDetail = "Pakketten, prijzen en features worden uitgewerkt."; }
  else if (hasSection) { compLabel = "Secties toevoegen"; compDetail = "Nieuwe contentblokken worden toegevoegd."; }
  else if (hasHero) { compLabel = "Hero-sectie maken"; compDetail = "De grote kopsectie met titel en CTA wordt opgezet."; }

  let styleLabel = "Styling toepassen"; let styleDetail = "Layout, kleuren en responsive design worden afgewerkt.";
  if (hasColor) { styleLabel = "Kleuren doorvoeren"; styleDetail = "Het nieuwe kleurenschema wordt overal toegepast."; }

  let interLabel = "Werking controleren"; let interDetail = "Ik check of alle knoppen en links goed functioneren.";
  if (hasForm) { interLabel = "Formulier testen"; interDetail = "Validatie en verzendlogica worden gecontroleerd."; }
  else if (hasBooking) { interLabel = "Boekingsflow testen"; interDetail = "Het hele reserveringsproces wordt doorgelopen."; }
  else if (hasDownload) { interLabel = "Download testen"; interDetail = "De downloadfunctie wordt gevalideerd."; }

  const finalStep = pick([
    { label: "Preview verversen", detail: "De bijgewerkte versie wordt geladen." },
    { label: "Resultaat klaarzetten", detail: "Nog even controleren, dan is het klaar." },
    { label: "Laatste check", detail: "Alles ziet er goed uit — preview wordt geladen." },
  ]);

  return [
    { phase: "analyzing", ...pick(analyzeLabels), progress: 12 },
    { phase: "planning", label: planLabel, detail: planDetail, progress: 26 },
    { phase: "generating", ...genStep, progress: 44 },
    { phase: "components", label: compLabel, detail: compDetail, progress: 62 },
    { phase: "styling", label: styleLabel, detail: styleDetail, progress: 78 },
    { phase: "interactivity", label: interLabel, detail: interDetail, progress: 90 },
    { phase: "finalizing", ...finalStep, progress: 96 },
  ];
}

let BUILD_PHASES = generateContextualPhases("", "create");

const createBuildStatus = (
  activeIndex: number, latestPrompt: string, mode: "create" | "update", done = false,
): BuildStatus => ({
  phase: done ? "done" : BUILD_PHASES[Math.min(activeIndex, BUILD_PHASES.length - 1)].phase,
  detail: done
    ? pick(mode === "update"
        ? ["Klaar — je app is bijgewerkt!", "Gedaan, de preview is vernieuwd.", "Alles is doorgevoerd. Bekijk het resultaat →"]
        : ["Je app staat klaar in de preview!", "Eerste versie is live — check het rechts.", "Gebouwd en geladen. Laat maar weten wat je wilt aanpassen."])
    : BUILD_PHASES[Math.min(activeIndex, BUILD_PHASES.length - 1)].detail,
  progress: done ? 100 : BUILD_PHASES[Math.min(activeIndex, BUILD_PHASES.length - 1)].progress,
  mode, latestPrompt,
  steps: BUILD_PHASES.map((step, index) => ({
    phase: step.phase, label: step.label, detail: step.detail,
    status: done || index < activeIndex ? "done" : index === activeIndex ? "active" : "pending",
  })),
});

type ViewState = "home" | "editor" | "projects";

const Index = () => {
  const [currentView, setCurrentView] = useState<ViewState>("home");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [buildStatus, setBuildStatus] = useState<BuildStatus | null>(null);
  const [currentProject, setCurrentProject] = useState<AppProject | null>(null);
  const [showPublish, setShowPublish] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const phaseIndexRef = useRef(0);
  const phaseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { return () => { if (phaseTimerRef.current) clearInterval(phaseTimerRef.current); }; }, []);

  const startBuildProgress = (latestPrompt: string, mode: "create" | "update") => {
    if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
    BUILD_PHASES = generateContextualPhases(latestPrompt, mode);
    phaseIndexRef.current = 0;
    setBuildStatus(createBuildStatus(0, latestPrompt, mode));
    phaseTimerRef.current = setInterval(() => {
      phaseIndexRef.current += 1;
      if (phaseIndexRef.current < BUILD_PHASES.length) {
        setBuildStatus(createBuildStatus(phaseIndexRef.current, latestPrompt, mode));
      } else { if (phaseTimerRef.current) clearInterval(phaseTimerRef.current); }
    }, 2500);
  };

  const stopBuildProgress = (latestPrompt: string, mode: "create" | "update") => {
    if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
    phaseTimerRef.current = null;
    setBuildStatus(createBuildStatus(BUILD_PHASES.length - 1, latestPrompt, mode, true));
    setTimeout(() => setBuildStatus(null), 2000);
  };

  const saveHtmlToProject = (html: string) => {
    if (currentProject) {
      const updated = updateProject(currentProject.id, { html });
      if (updated) setCurrentProject(updated);
    } else {
      const proj = createProject("Naamloos project", html);
      setCurrentProject(proj);
    }
  };

  const handleSend = async (input: string) => {
    if (currentView !== "editor") setCurrentView("editor");
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
        messages: conversationForAi, currentHtml: generatedHtml,
        onDelta: (chunk) => { fullResponse += chunk; },
        onDone: () => {
          let html = fullResponse;
          if (html.includes("```html")) html = html.replace(/```html\n?/g, "").replace(/```\n?/g, "");
          html = html.trim();

          if (html.includes("<!DOCTYPE") || html.includes("<html")) {
            const isSameHtml = generatedHtml?.trim() === html;
            setGeneratedHtml(html);
            saveHtmlToProject(html);

            const sameResponses = [
              `Hmm, de app ziet er hetzelfde uit.\n\nProbeer specifieker, bijv. "maak de achtergrond donkerblauw" of "voeg een FAQ-sectie toe".`,
              `Er veranderde niks merkbaar.\n\nTip: wees concreter — bijv. "verander de titel naar X" of "voeg een prijstabel toe".`,
            ];
            const updateResponses = [
              `Top, gefixt! 🛠️\n\n✓ "${input}" doorgevoerd\n✓ Preview bijgewerkt\n\nWat wil je hierna aanpassen?`,
              `Geregeld! ✅\n\n✓ Verzoek verwerkt\n✓ Rest onaangetast\n\nKijk even of het klopt.`,
              `Update staat live 🚀\n\n✓ "${input}" verwerkt\n✓ Functionaliteit behouden\n\nWat nu?`,
            ];
            const createResponses = [
              `Je app staat klaar! 🎉\n\n✓ Werkende pagina gebouwd\n✓ Preview beschikbaar\n\nVertel me wat je wilt veranderen.`,
              `Eerste versie live! ✨\n\n✓ Complete pagina gebouwd\n✓ Klaar om te itereren\n\nWat wil je aanpassen?`,
              `Nice, hier is je app! 💪\n\n✓ Responsive design inbegrepen\n\nSchiet maar met je feedback.`,
            ];

            setMessages((prev) => [...prev, {
              role: "assistant",
              content: isSameHtml ? pick(sameResponses) : mode === "update" ? pick(updateResponses) : pick(createResponses),
            }]);
          } else {
            setMessages((prev) => [...prev, { role: "assistant", content: `Geen geldige app ontvangen.\n\n${fullResponse}` }]);
          }
          setIsLoading(false);
          stopBuildProgress(input, mode);
        },
        onError: (error) => { toast.error(error); setIsLoading(false); stopBuildProgress(input, mode); },
      });
    } catch {
      toast.error("Generatie mislukt. Probeer het opnieuw.");
      setIsLoading(false);
      stopBuildProgress(input, mode);
    }
  };

  const handleNewProject = () => {
    setMessages([]);
    setGeneratedHtml(null);
    setCurrentProject(null);
    setBuildStatus(null);
    setCurrentView("home");
  };

  const handleOpenProject = (project: AppProject) => {
    setCurrentProject(project);
    setGeneratedHtml(project.html);
    setMessages([]);
    setCurrentView("editor");
  };

  const handleProjectUpdate = (updates: Partial<AppProject>) => {
    if (!currentProject) return;
    const updated = updateProject(currentProject.id, updates);
    if (updated) setCurrentProject(updated);
  };

  const showSidebar = currentView !== "editor";

  return (
    <div className="flex h-screen bg-background">
      {showSidebar && (
        <AppSidebar
          onNewProject={handleNewProject}
          onOpenProject={handleOpenProject}
          onShowAllProjects={() => setCurrentView("projects")}
          onGoHome={() => { setCurrentView("home"); }}
          activeProjectId={currentProject?.id}
          currentView={currentView}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {currentView === "home" && (
          <WelcomeScreen onSend={handleSend} />
        )}

        {currentView === "projects" && (
          <AllProjectsView
            onNewProject={handleNewProject}
            onOpenProject={handleOpenProject}
          />
        )}

        {currentView === "editor" && (
          <>
            <header className="flex items-center justify-between border-b border-border bg-card px-5 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative group">
                  <button className="text-sm font-bold hover:text-muted-foreground transition-colors flex items-center gap-1.5">
                    {currentProject?.name || "Mellow"}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </button>
                  <div className="absolute top-full left-0 mt-1 w-48 rounded-lg border border-border bg-card shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <button
                      onClick={() => setCurrentView("home")}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] text-foreground hover:bg-secondary rounded-t-lg transition-colors"
                    >
                      <Home className="h-4 w-4" />
                      Dashboard
                    </button>
                    <button
                      onClick={() => setCurrentView("projects")}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] text-foreground hover:bg-secondary rounded-b-lg transition-colors"
                    >
                      <FolderOpen className="h-4 w-4" />
                      Alle projecten
                    </button>
                  </div>
                </div>
              </div>
              <Button variant="default" size="sm" onClick={() => setShowPublish(true)} disabled={!generatedHtml}>
                <Globe className="h-4 w-4 mr-1.5" />
                Publiceer
              </Button>
            </header>

            <div className="flex flex-1 overflow-hidden">
              <div className="w-[380px] flex flex-col border-r border-border shrink-0">
                <ChatMessages messages={messages} isLoading={isLoading} buildStatus={buildStatus} />
                <div ref={messagesEndRef} />
                <ChatInput onSend={handleSend} isLoading={isLoading} placeholder="Beschrijf wijzigingen..." />
              </div>
              <LivePreview html={generatedHtml} />
            </div>

            {showPublish && currentProject && (
              <PublishPanel
                project={currentProject}
                html={generatedHtml || ""}
                onUpdate={handleProjectUpdate}
                onClose={() => setShowPublish(false)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
