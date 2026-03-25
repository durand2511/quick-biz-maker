import type { ChatMessage } from "@/lib/aiStream";
import { Bot, User, Loader2 } from "lucide-react";

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  loadingText?: string;
}

const ChatMessages = ({ messages, isLoading, loadingText }: Props) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((msg, i) => (
        <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : ""}`}>
          {msg.role === "assistant" && (
            <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
          )}
          <div
            className={`rounded-xl px-3.5 py-2 text-sm max-w-[85%] ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
          </div>
          {msg.role === "user" && (
            <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center shrink-0 mt-0.5">
              <User className="h-3.5 w-3.5 text-secondary-foreground" />
            </div>
          )}
        </div>
      ))}

      {isLoading && (
        <div className="flex gap-2.5">
          <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          </div>
          <div className="bg-secondary rounded-xl px-3.5 py-2 text-sm text-muted-foreground max-w-[85%]">
            <span>{loadingText || "Even nadenken..."}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessages;
