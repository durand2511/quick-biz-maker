import type { ChatMessage } from "@/lib/aiStream";
import type { BuildStatus } from "@/pages/Index";
import { Bot, User, Loader2, CheckCircle2, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  buildStatus?: BuildStatus | null;
}

const ChatMessages = ({ messages, isLoading, buildStatus }: Props) => {
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
            {msg.role === "assistant"
              ? msg.content.includes("<!DOCTYPE") || msg.content.includes("<html")
                ? "✅ App gegenereerd! Bekijk de live preview →"
                : <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              : msg.content}
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
          <div className="bg-secondary rounded-xl px-3.5 py-2.5 text-sm text-muted-foreground w-[85%] space-y-2 ml-8">
            <div className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span className="font-medium">
                {buildStatus?.detail || "Bezig met genereren..."}
              </span>
            </div>
            {buildStatus && (
              <>
                <Progress value={buildStatus.progress} className="h-1.5" />
                <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
                    {buildStatus.mode === "update" ? "Laatste wijziging" : "Nieuwe app"}
                  </p>
                  <p className="mt-1 text-sm text-foreground">{buildStatus.latestPrompt}</p>
                </div>
                <div className="space-y-2 rounded-lg border border-border/60 bg-background/40 p-3">
                  {buildStatus.steps.map((step) => (
                    <div key={step.phase} className="flex gap-2.5">
                      <div className="mt-0.5 shrink-0">
                        {step.status === "done" ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : step.status === "active" ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/60" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{step.label}</p>
                        <p className="text-xs text-muted-foreground">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
                  <span>AI builder actief</span>
                  <span>{buildStatus.progress}%</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessages;
