import type { ChatMessage } from "@/lib/aiStream";
import { Bot, User, Loader2 } from "lucide-react";

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
}

const ChatMessages = ({ messages, isLoading }: Props) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-20">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">What do you want to build?</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Describe your app idea and I'll generate it instantly. You can refine it with follow-up messages.
          </p>
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {[
              "A booking app for my fitness studio",
              "Portfolio website for a photographer",
              "Restaurant landing page with menu",
            ].map((suggestion) => (
              <span
                key={suggestion}
                className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground"
              >
                {suggestion}
              </span>
            ))}
          </div>
        </div>
      )}

      {messages.map((msg, i) => (
        <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
          {msg.role === "assistant" && (
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="h-4 w-4 text-primary" />
            </div>
          )}
          <div
            className={`rounded-xl px-4 py-2.5 text-sm max-w-[80%] ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            }`}
          >
            {msg.role === "assistant"
              ? msg.content.includes("<!DOCTYPE") || msg.content.includes("<html")
                ? "✅ App generated! Check the preview →"
                : msg.content
              : msg.content}
          </div>
          {msg.role === "user" && (
            <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
              <User className="h-4 w-4 text-secondary-foreground" />
            </div>
          )}
        </div>
      ))}

      {isLoading && (
        <div className="flex gap-3">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div className="bg-muted rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Generating your app...
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessages;
