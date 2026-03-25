import { useState, useRef, useEffect } from "react";
import { ArrowUp, Square, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";

interface Attachment {
  file: File;
  preview?: string;
}

interface Props {
  onSend: (message: string, attachments?: File[]) => void;
  isLoading: boolean;
  placeholder?: string;
}

const ChatInput = ({ onSend, isLoading, placeholder }: Props) => {
  const [input, setInput] = useState("");
  const [queued, setQueued] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  useEffect(() => {
    if (!isLoading && queued) {
      onSend(queued);
      setQueued(null);
    }
  }, [isLoading, queued, onSend]);

  const handleSubmit = () => {
    if (!input.trim() && attachments.length === 0) return;
    if (isLoading) {
      setQueued(input.trim());
      setInput("");
      return;
    }
    const files = attachments.map((a) => a.file);
    onSend(input.trim(), files.length > 0 ? files : undefined);
    setInput("");
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newAttachments: Attachment[] = files.map((file) => {
      const attachment: Attachment = { file };
      if (file.type.startsWith("image/")) {
        attachment.preview = URL.createObjectURL(file);
      }
      return attachment;
    });
    setAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const removed = prev[index];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const isImage = (file: File) => file.type.startsWith("image/");

  return (
    <div className="p-4 flex flex-col items-center">
      {queued && (
        <div className="text-xs text-muted-foreground mb-2">
          Bericht in wachtrij: "{queued.slice(0, 40)}{queued.length > 40 ? "…" : ""}"
        </div>
      )}
      <div className="w-full max-w-3xl space-y-2">
        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="flex gap-2 flex-wrap px-1">
            {attachments.map((att, i) => (
              <div
                key={i}
                className="relative group rounded-lg border border-border bg-card overflow-hidden"
              >
                {att.preview ? (
                  <img src={att.preview} alt={att.file.name} className="h-16 w-16 object-cover" />
                ) : (
                  <div className="h-16 w-16 flex flex-col items-center justify-center gap-1 px-1">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                      {att.file.name.slice(0, 12)}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(i)}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-foreground text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div className="flex items-end gap-3 rounded-2xl border border-border bg-card px-4 py-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
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
            disabled={!input.trim() && attachments.length === 0}
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
    </div>
  );
};

export default ChatInput;
