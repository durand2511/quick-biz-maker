import { useState, useRef, useEffect } from "react";
import { Wand2 } from "lucide-react";
import ChatInput from "@/components/ChatInput";
import ChatMessages from "@/components/ChatMessages";
import LivePreview from "@/components/LivePreview";
import WelcomeScreen from "@/components/WelcomeScreen";
import { streamGenerateApp, type ChatMessage } from "@/lib/aiStream";
import { toast } from "sonner";

const Index = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (input: string) => {
    if (!hasStarted) setHasStarted(true);

    const userMsg: ChatMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    let fullResponse = "";

    try {
      await streamGenerateApp({
        messages: updatedMessages,
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
            setGeneratedHtml(html);
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: html },
            ]);
          } else {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: fullResponse },
            ]);
          }
          setIsLoading(false);
        },
        onError: (error) => {
          toast.error(error);
          setIsLoading(false);
        },
      });
    } catch {
      toast.error("Failed to generate app. Please try again.");
      setIsLoading(false);
    }
  };

  // Welcome screen (before first prompt)
  if (!hasStarted) {
    return <WelcomeScreen onSend={handleSend} />;
  }

  // Builder view (after first prompt)
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border bg-card px-5 py-3 shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
          <Wand2 className="h-4 w-4 text-primary-foreground" />
        </div>
        <h1 className="text-sm font-bold">AppForge</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat panel */}
        <div className="w-[380px] flex flex-col border-r border-border shrink-0">
          <ChatMessages messages={messages} isLoading={isLoading} />
          <div ref={messagesEndRef} />
          <ChatInput
            onSend={handleSend}
            isLoading={isLoading}
            placeholder="Describe changes..."
          />
        </div>

        {/* Preview */}
        <LivePreview html={generatedHtml} />
      </div>
    </div>
  );
};

export default Index;
