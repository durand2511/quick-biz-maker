import { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown, Home, FolderOpen, Plus, LogOut, Files } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatInput, { type PlanData } from "@/components/ChatInput";
import ChatMessages from "@/components/ChatMessages";
import LivePreview from "@/components/LivePreview";
import WelcomeScreen from "@/components/WelcomeScreen";
import AppSidebar from "@/components/AppSidebar";
import AllProjectsView from "@/components/AllProjectsView";
import PublishPanel from "@/components/PublishPanel";
import FileManager from "@/components/FileManager";
import { chatWithAI, planWithAI, streamGenerateApp, type ChatMessage } from "@/lib/aiStream";
import { createProject, updateProject, type AppProject } from "@/lib/projects";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type ViewState = "home" | "editor" | "projects";

const LOADING_STAGES = [
  "Verzoek verwerken...",
  "Componenten updaten...",
  "Wijzigingen toepassen...",
  "Layout aanpassen...",
  "Bijna klaar...",
];

const INIT_STAGES = [
  "Starting fresh session...",
  "Clearing previous data",
  "Creating new environment",
  "Ready",
];

const Index = () => {
  const { user, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>("home");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState(LOADING_STAGES[0]);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentProject, setCurrentProject] = useState<AppProject | null>(null);
  const [showPublish, setShowPublish] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [planPrompt, setPlanPrompt] = useState("");
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [isInitializing, setIsInitializing] = useState(false);
  const [initText, setInitText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadingStageRef = useRef(0);
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const saveCurrentProject = async () => {
    if (currentProject) {
      await updateProject(currentProject.id, {
        chatHistory: messages,
        html: generatedHtml || currentProject.html,
      });
    }
  };

  const resetProjectState = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    setIsStreaming(false);
    stopLoadingCycle();
    setMessages([]);
    setGeneratedHtml(null);
    setCurrentProject(null);
    setPlan(null);
    setPlanPrompt("");
    setShowPublish(false);
    setSessionId(crypto.randomUUID());
  };

  const showInitAnimation = async () => {
    setIsInitializing(true);
    for (const stage of INIT_STAGES) {
      setInitText(stage);
      await new Promise((r) => setTimeout(r, 400));
    }
    await new Promise((r) => setTimeout(r, 300));
    setIsInitializing(false);
    setInitText("");
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { return () => { if (loadingTimerRef.current) clearInterval(loadingTimerRef.current); }; }, []);

  const startLoadingCycle = () => {
    loadingStageRef.current = 0;
    setLoadingText(LOADING_STAGES[0]);
    if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
    loadingTimerRef.current = setInterval(() => {
      loadingStageRef.current = Math.min(loadingStageRef.current + 1, LOADING_STAGES.length - 1);
      setLoadingText(LOADING_STAGES[loadingStageRef.current]);
    }, 2200);
  };

  const stopLoadingCycle = () => {
    if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
    loadingTimerRef.current = null;
  };

  const saveChatToProject = (msgs: ChatMessage[]) => {
    if (currentProject) {
      updateProject(currentProject.id, { chatHistory: msgs });
    }
  };

  const saveHtmlToProject = async (html: string) => {
    if (currentProject) {
      const updated = await updateProject(currentProject.id, { html });
      if (updated) setCurrentProject(updated);
    }
  };

  const replaceImagePlaceholders = (html: string, images?: string[]): string => {
    if (!images || images.length === 0) return html;
    let result = html;
    images.forEach((dataUrl, i) => {
      const placeholder = `{{USER_IMAGE_${i + 1}}}`;
      while (result.includes(placeholder)) {
        result = result.replace(placeholder, dataUrl);
      }
    });
    return result;
  };

  const executeBuild = async (input: string, msgsBeforeBuild: ChatMessage[], planDetails?: string, images?: string[]) => {
    startLoadingCycle();
    setIsStreaming(true);

    const mode = generatedHtml ? "update" : "create";
    const userContent = generatedHtml
      ? `Pas de bestaande app gericht aan op basis van deze laatste wijziging: ${input}`
      : input;
    const userMsg: ChatMessage = { role: "user", content: userContent, ...(images && { images }) };
    const conversationForAi: ChatMessage[] = [
      ...msgsBeforeBuild
        .filter(m => m.role === "user")
        .map(m => ({ role: "user" as const, content: m.content, ...(m.images && { images: m.images }) })),
      userMsg,
    ];

    let fullResponse = "";
    let lastPreviewUpdate = 0;
    const PREVIEW_INTERVAL = 800;

    await streamGenerateApp({
      messages: conversationForAi,
      currentHtml: generatedHtml,
      onDelta: (chunk) => {
        fullResponse += chunk;
        const now = Date.now();
        if (now - lastPreviewUpdate > PREVIEW_INTERVAL) {
          const partial = fullResponse.trim();
          if (partial.includes("<body") && partial.length > 500) {
            let previewHtml = partial;
            if (!previewHtml.includes("</body>")) previewHtml += "\n</body></html>";
            setGeneratedHtml(replaceImagePlaceholders(previewHtml, images));
          }
          lastPreviewUpdate = now;
        }
      },
      onDone: () => {
        let html = fullResponse;
        if (html.includes("```html")) html = html.replace(/```html\n?/g, "").replace(/```\n?/g, "");
        html = html.trim();
        if (html.includes("<!DOCTYPE") || html.includes("<html")) {
          html = replaceImagePlaceholders(html, images);
          setGeneratedHtml(html);
          saveHtmlToProject(html);
        }

        if (planDetails) {
          const summaryMsg: ChatMessage = {
            role: "assistant",
            title: mode === "update" ? "Wijziging toegepast" : "App gebouwd",
            content: "",
            details: planDetails,
          };
          setMessages((prev) => {
            const updated = [...prev, summaryMsg];
            saveChatToProject(updated);
            return updated;
          });
        }

        setIsLoading(false);
        setIsStreaming(false);
        stopLoadingCycle();
      },
      onError: (error) => {
        toast.error(error);
        setIsLoading(false);
        setIsStreaming(false);
        stopLoadingCycle();
      },
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSend = async (input: string, attachments?: File[]) => {
    if (currentView !== "editor") {
      await saveCurrentProject();
      resetProjectState();
      setCurrentView("editor");
      await showInitAnimation();
    }

    if (!currentProject && user) {
      const newProject = await createProject("Nieuw project", "", user.id);
      if (newProject) setCurrentProject(newProject);
    }

    let images: string[] | undefined;
    if (attachments && attachments.length > 0) {
      const imageFiles = attachments.filter(f => f.type.startsWith("image/"));
      if (imageFiles.length > 0) {
        images = await Promise.all(imageFiles.map(fileToBase64));
      }
    }

    const userMsg: ChatMessage = { role: "user", content: input, ...(images && { images }) };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);
    setLoadingText("Even nadenken...");

    try {
      const chatResponse = await chatWithAI({
        messages: updatedMessages,
        hasExistingApp: !!generatedHtml,
      });

      if (!chatResponse.shouldBuild) {
        const newMsgs = [...updatedMessages, { role: "assistant" as const, content: chatResponse.message, title: chatResponse.title }];
        setMessages(newMsgs);
        saveChatToProject(newMsgs);
        setIsLoading(false);
        return;
      }

      const msgsWithResponse = [...updatedMessages, { role: "assistant" as const, content: chatResponse.message, title: chatResponse.title }];
      setMessages(msgsWithResponse);
      saveChatToProject(msgsWithResponse);

      await executeBuild(input, msgsWithResponse, undefined, images);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Er ging iets mis. Probeer het opnieuw.");
      setIsLoading(false);
      setIsStreaming(false);
      stopLoadingCycle();
    }
  };

  const handleRequestPlan = async (input: string) => {
    if (currentView !== "editor") setCurrentView("editor");
    setPlanPrompt(input);
    setIsLoading(true);
    setLoadingText("Plan opstellen...");

    const userMsg: ChatMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    try {
      const planResult = await planWithAI({
        prompt: input,
        hasExistingApp: !!generatedHtml,
        currentHtml: generatedHtml,
      });

      setPlan({ summary: planResult.summary, steps: planResult.steps });
      setIsLoading(false);
    } catch (e) {
      toast.error("Plan maken mislukt.");
      setIsLoading(false);
    }
  };

  const handleApprovePlan = async () => {
    const currentPlan = plan;
    setPlan(null);
    setIsLoading(true);
    setLoadingText("Plan uitvoeren...");

    const planDetailsText = currentPlan
      ? currentPlan.steps.map((s, i) => `${i + 1}. ${s.title}\n   ${s.description}`).join("\n")
      : undefined;

    try {
      await executeBuild(planPrompt, messages, planDetailsText);
    } catch (e) {
      toast.error("Uitvoering mislukt.");
      setIsLoading(false);
      setIsStreaming(false);
      stopLoadingCycle();
    }
  };

  const handleRejectPlan = () => {
    setPlan(null);
    const rejectMsg: ChatMessage = { role: "assistant" as const, content: "Geen probleem, pas je verzoek aan en probeer het opnieuw.", title: "Plan afgewezen" };
    setMessages((prev) => [...prev, rejectMsg]);
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    setIsStreaming(false);
    stopLoadingCycle();
    const cancelMsg: ChatMessage = { role: "assistant" as const, content: "Afgebroken.", title: "Gestopt" };
    setMessages((prev) => [...prev, cancelMsg]);
  };

  const handleNewProject = () => {
    saveCurrentProject();
    resetProjectState();
    setCurrentView("home");
  };

  const handleNewChat = async () => {
    await saveCurrentProject();
    resetProjectState();
    setGeneratedHtml(null);

    if (user) {
      const newProject = await createProject("Nieuw project", "", user.id);
      if (newProject) setCurrentProject(newProject);
    }

    setCurrentView("editor");
    await showInitAnimation();
  };

  const handleOpenProject = (project: AppProject) => {
    saveCurrentProject();
    setCurrentProject(project);
    setGeneratedHtml(project.html);
    setMessages(project.chatHistory || []);
    setPlan(null);
    setPlanPrompt("");
    setSessionId(crypto.randomUUID());
    setCurrentView("editor");
  };

  const handleProjectUpdate = async (updates: Partial<AppProject>) => {
    if (!currentProject) return;
    const updated = await updateProject(currentProject.id, updates);
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

      <div className="flex-1 flex flex-col min-w-0">
        {currentView === "home" && (
          <WelcomeScreen onSend={handleSend} />
        )}

        {currentView === "projects" && (
          <AllProjectsView
            key={currentView}
            onNewProject={handleNewProject}
            onOpenProject={handleOpenProject}
          />
        )}

        {currentView === "editor" && (
          <div key={sessionId} className="flex flex-col flex-1 min-h-0">
            {isInitializing && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground animate-pulse">{initText}</p>
                </div>
              </div>
            )}
            <header className="flex items-center justify-between border-b border-border bg-card px-5 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative group">
                  <button className="text-sm font-bold hover:text-muted-foreground transition-colors flex items-center gap-1.5">
                    {currentProject?.name || "Mellow"}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </button>
                  <div className="absolute top-full left-0 mt-1 w-48 rounded-lg border border-border bg-card shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <button
                      onClick={handleNewChat}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] text-foreground hover:bg-secondary rounded-t-lg transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Nieuw project
                    </button>
                    <button
                      onClick={() => setCurrentView("home")}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] text-foreground hover:bg-secondary transition-colors"
                    >
                      <Home className="h-4 w-4" />
                      Dashboard
                    </button>
                    <button
                      onClick={() => setCurrentView("projects")}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] text-foreground hover:bg-secondary transition-colors"
                    >
                      <FolderOpen className="h-4 w-4" />
                      Alle projecten
                    </button>
                    <button
                      onClick={signOut}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] text-destructive hover:bg-secondary rounded-b-lg transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Uitloggen
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowFiles(true)}>
                  <Files className="h-4 w-4 mr-1.5" />
                  Bestanden
                </Button>
                <Button variant="default" size="sm" onClick={() => setShowPublish(true)} disabled={!generatedHtml}>
                  <Globe className="h-4 w-4 mr-1.5" />
                  Publiceer
                </Button>
              </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
              <div className="w-[380px] flex flex-col border-r border-border shrink-0">
                {messages.length === 0 && !isLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center px-4">
                    <ChatInput
                      onSend={handleSend}
                      onRequestPlan={handleRequestPlan}
                      onCancel={handleCancel}
                      isLoading={isLoading}
                      placeholder="Vraag Mellow..."
                      plan={plan}
                      onApprovePlan={handleApprovePlan}
                      onRejectPlan={handleRejectPlan}
                    />
                  </div>
                ) : (
                  <>
                    <ChatMessages messages={messages} isLoading={isLoading} loadingText={loadingText} />
                    <ChatInput
                      onSend={handleSend}
                      onRequestPlan={handleRequestPlan}
                      onCancel={handleCancel}
                      isLoading={isLoading}
                      placeholder="Vraag Mellow..."
                      plan={plan}
                      onApprovePlan={handleApprovePlan}
                      onRejectPlan={handleRejectPlan}
                    />
                  </>
                )}
              </div>
              <LivePreview key={sessionId} html={generatedHtml} isStreaming={isStreaming} />
            </div>

            {showPublish && currentProject && (
              <PublishPanel
                project={currentProject}
                html={generatedHtml || ""}
                onUpdate={handleProjectUpdate}
                onClose={() => setShowPublish(false)}
              />
            )}

            {showFiles && (
              <FileManager
                projectId={currentProject?.id}
                onClose={() => setShowFiles(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
