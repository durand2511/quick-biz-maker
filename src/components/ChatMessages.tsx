import type { ChatMessage } from "@/lib/aiStream";
import { User, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  loadingText?: string;
}

const AnimatedDots = () => {
  const [dots, setDots] = useState("");
  useEffect(() => {
    const timer = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(timer);
  }, []);
  return <span className="inline-block w-4">{dots}</span>;
};

const ChatMessages = ({ messages, isLoading, loadingText }: Props) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((msg, i) => (
        <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : ""}`}>
          {msg.role === "assistant" ? (
            <div className="max-w-[85%] px-1">
              <div className="whitespace-pre-wrap leading-relaxed text-sm text-foreground">{msg.content}</div>
            </div>
          ) : (
            <>
              <div className="rounded-xl px-3.5 py-2 text-sm max-w-[85%] bg-secondary text-secondary-foreground">
                {msg.content}
              </div>
              <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-3.5 w-3.5 text-secondary-foreground" />
              </div>
            </>
          )}
        </div>
      ))}

      {isLoading && (
        <div className="flex gap-2.5 animate-in fade-in duration-300">
          <div className="max-w-[85%] px-1">
            <span className="text-sm text-muted-foreground">{loadingText || "Even nadenken"}</span>
            <AnimatedDots />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessages;
