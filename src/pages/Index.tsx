import { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown, Home, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatInput from "@/components/ChatInput";
import ChatMessages from "@/components/ChatMessages";
import LivePreview from "@/components/LivePreview";
import WelcomeScreen from "@/components/WelcomeScreen";
import AppSidebar from "@/components/AppSidebar";
import AllProjectsView from "@/components/AllProjectsView";
import PublishPanel from "@/components/PublishPanel";
import { chatWithAI, streamGenerateApp, type ChatMessage } from "@/lib/aiStream";
import { createProject, updateProject, type AppProject } from "@/lib/projects";
import { toast } from "sonner";

type ViewState = "home" | "editor" | "projects";

const LOADING_STAGES = [
  "Verzoek verwerken...",
  "Componenten updaten...",
  "Wijzigingen toepassen...",
  "Layout aanpassen...",
  "Bijna klaar...",
];

const Index = () => {
  const [currentView, setCurrentView] = useState<ViewState>("home");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState(LOADING_STAGES[0]);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentProject, setCurrentProject] = useState<AppProject | null>(null);
  const [showPublish, setShowPublish] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadingStageRef = useRef(0);
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

    const userMsg: ChatMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);
    setLoadingText("Even nadenken...");

    try {
      // Step 1: Chat AI understands intent (fast model)
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

      // Step 2: Show AI response immediately, then start building
      const msgsWithResponse = [...updatedMessages, { role: "assistant" as const, content: chatResponse.message, title: chatResponse.title }];
      setMessages(msgsWithResponse);
      saveChatToProject(msgsWithResponse);

      // Start cycling loading messages
      startLoadingCycle();
      setIsStreaming(true);

      // Step 3: Stream HTML with progressive preview updates
      const mode = generatedHtml ? "update" : "create";
      const conversationForAi: ChatMessage[] = generatedHtml
        ? [{ role: "user", content: `Pas de bestaande app gericht aan op basis van deze laatste wijziging: ${input}` }]
        : [userMsg];

      let fullResponse = "";
      let lastPreviewUpdate = 0;
      const PREVIEW_INTERVAL = 800; // Update preview every 800ms for perceived speed

      await streamGenerateApp({
        messages: conversationForAi,
        currentHtml: generatedHtml,
        onDelta: (chunk) => {
          fullResponse += chunk;

          // Progressive preview: update iframe periodically during streaming
          const now = Date.now();
          if (now - lastPreviewUpdate > PREVIEW_INTERVAL) {
            const partial = fullResponse.trim();
            // Only show if we have enough HTML structure
            if (partial.includes("<body") && partial.length > 500) {
              // Auto-close open tags for valid partial render
              let previewHtml = partial;
              if (!previewHtml.includes("</body>")) previewHtml += "\n</body></html>";
              setGeneratedHtml(previewHtml);
            }
            lastPreviewUpdate = now;
          }
        },
        onDone: () => {
          let html = fullResponse;
          if (html.includes("```html")) html = html.replace(/```html\n?/g, "").replace(/```\n?/g, "");
          html = html.trim();

          if (html.includes("<!DOCTYPE") || html.includes("<html")) {
            setGeneratedHtml(html);
            saveHtmlToProject(html);
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Er ging iets mis. Probeer het opnieuw.");
      setIsLoading(false);
      setIsStreaming(false);
      stopLoadingCycle();
    }
  };

  const handleNewProject = () => {
    setMessages([]);
    setGeneratedHtml(null);
    setCurrentProject(null);
    setCurrentView("home");
  };

  const handleOpenProject = (project: AppProject) => {
    setCurrentProject(project);
    setGeneratedHtml(project.html);
    setMessages(project.chatHistory || []);
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
                {messages.length === 0 && !isLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center px-4">
                    <ChatInput onSend={handleSend} isLoading={isLoading} placeholder="Beschrijf wijzigingen..." />
                  </div>
                ) : (
                  <>
                    <ChatMessages messages={messages} isLoading={isLoading} loadingText={loadingText} />
                    <div ref={messagesEndRef} />
                    <ChatInput onSend={handleSend} isLoading={isLoading} placeholder="Beschrijf wijzigingen..." />
                  </>
                )}
              </div>
              <LivePreview html={generatedHtml} isStreaming={isStreaming} />
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
