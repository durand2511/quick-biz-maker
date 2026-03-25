import { useState, useRef, useEffect } from "react";
import { ArrowUp, Square } from "lucide-react";

interface Props {
  onSend: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

const ChatInput = ({ onSend, isLoading, placeholder }: Props) => {
  const [input, setInput] = useState("");
  const [queued, setQueued] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  // Send queued message when loading finishes
  useEffect(() => {
    if (!isLoading && queued) {
      onSend(queued);
      setQueued(null);
    }
  }, [isLoading, queued, onSend]);

  const handleSubmit = () => {
    if (!input.trim()) return;
    if (isLoading) {
      // Queue the message
      setQueued(input.trim());
      setInput("");
      return;
    }
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-4 flex flex-col items-center">
      {queued && (
        <div className="text-xs text-muted-foreground mb-2">
          Bericht in wachtrij: "{queued.slice(0, 40)}{queued.length > 40 ? "…" : ""}"
        </div>
      )}
      <div className="flex items-end gap-3 w-full max-w-3xl rounded-2xl border border-border bg-card px-4 py-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Describe what you want to build..."}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-foreground focus:outline-none placeholder:text-muted-foreground"
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-all hover:opacity-80 disabled:opacity-30"
        >
          {isLoading ? (
            <Square className="h-3.5 w-3.5 fill-current" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
