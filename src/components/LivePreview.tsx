import { Button } from "@/components/ui/button";
import { ExternalLink, Smartphone, Monitor, FileDown, Loader2 } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface Props {
  html: string | null;
  isStreaming?: boolean;
  isBigChange?: boolean;
}

const IFRAME_SHELL = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;height:100%;overflow:auto;}</style></head>
<body>
<script>
window.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'mellow-update') {
    document.open();
    document.write(e.data.html);
    document.close();
  }
});
window.parent.postMessage({type:'mellow-ready'},'*');
</script>
</body></html>`;

const LivePreview = ({ html, isStreaming, isBigChange }: Props) => {
  const [isMobile, setIsMobile] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const pendingHtmlRef = useRef<string | null>(null);

  const sendHtml = useCallback((htmlContent: string) => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow && readyRef.current) {
      iframe.contentWindow.postMessage({ type: "mellow-update", html: htmlContent }, "*");
      pendingHtmlRef.current = null;
    } else {
      pendingHtmlRef.current = htmlContent;
    }
  }, []);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "mellow-ready") {
        readyRef.current = true;
        if (pendingHtmlRef.current) {
          sendHtml(pendingHtmlRef.current);
        } else if (html) {
          sendHtml(html);
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [html, sendHtml]);

  useEffect(() => {
    if (html) {
      sendHtml(html);
    }
  }, [html, sendHtml]);

  const handleDownloadHtml = () => {
    if (!html) return;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-app.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("HTML bestand gedownload!");
  };

  const handleOpen = () => {
    if (!html) return;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  if (!html) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center text-muted-foreground space-y-2">
          <Monitor className="h-12 w-12 mx-auto opacity-30" />
          <p className="text-sm font-medium">Live Preview</p>
          <p className="text-xs">Je gegenereerde app verschijnt hier</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-muted/30">
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-destructive/50" />
          <div className="w-3 h-3 rounded-full bg-accent-foreground/20" />
          <div className="w-3 h-3 rounded-full bg-accent-foreground/15" />
          <span className="text-xs text-muted-foreground ml-3">Preview</span>
          {isStreaming && isBigChange && (
            <div className="flex items-center gap-1.5 ml-2 text-xs text-primary animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Aan het opbouwen...</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setIsMobile(false)}>
            <Monitor className={`h-3.5 w-3.5 ${!isMobile ? "text-foreground" : "text-muted-foreground"}`} />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setIsMobile(true)}>
            <Smartphone className={`h-3.5 w-3.5 ${isMobile ? "text-foreground" : "text-muted-foreground"}`} />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleOpen}>
            <ExternalLink className="h-3 w-3 mr-1" />
            Open
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleDownloadHtml}>
            <FileDown className="h-3 w-3 mr-1" />
            HTML
          </Button>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center p-4 overflow-auto">
        <iframe
          ref={iframeRef}
          srcDoc={IFRAME_SHELL}
          className={`bg-card border border-border rounded-lg shadow-sm transition-all duration-300 h-full ${
            isMobile ? "w-[375px]" : "w-full"
          }`}
          title="Live Preview"
          sandbox="allow-scripts"
        />
      </div>
    </div>
  );
};

export default LivePreview;
