import { Button } from "@/components/ui/button";
import { ExternalLink, Smartphone, Monitor, FileDown, Loader2 } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import morphdom from "morphdom";

interface Props {
  html: string | null;
  isStreaming?: boolean;
}

/**
 * Extracts <head> inner content and <body> inner content + body attributes from a full HTML string.
 */
function parseHtmlParts(html: string) {
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const bodyMatch = html.match(/<body([^>]*)>([\s\S]*?)<\/body>/i);
  return {
    head: headMatch?.[1] ?? "",
    bodyAttrs: bodyMatch?.[1] ?? "",
    body: bodyMatch?.[2] ?? "",
  };
}

/**
 * Extracts external resources (stylesheets, scripts with src) from head HTML.
 * Returns a stable key for comparison and the full head content.
 */
function getResourceKey(headHtml: string): string {
  const links = [...headHtml.matchAll(/<link[^>]+href="([^"]+)"[^>]*>/gi)].map(m => m[1]);
  const scripts = [...headHtml.matchAll(/<script[^>]+src="([^"]+)"[^>]*>/gi)].map(m => m[1]);
  return [...links, ...scripts].sort().join("|");
}

const LivePreview = ({ html, isStreaming }: Props) => {
  const [isMobile, setIsMobile] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const prevHtmlRef = useRef<string | null>(null);
  const prevResourceKeyRef = useRef<string>("");
  const isInitializedRef = useRef(false);

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

  // Full write — used for initial load or when external resources change
  const fullWrite = useCallback((htmlContent: string) => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    
    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    isInitializedRef.current = true;
    prevHtmlRef.current = htmlContent;
    const { head } = parseHtmlParts(htmlContent);
    prevResourceKeyRef.current = getResourceKey(head);
  }, []);

  // Patch — morphdom only the <body>, update <head> styles/meta without reload
  const patchUpdate = useCallback((htmlContent: string) => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    if (!doc || !doc.body) return;

    const { head: newHead, body: newBody, bodyAttrs } = parseHtmlParts(htmlContent);

    // Morph the body content — preserves scroll, form state, focus
    try {
      // Create a temporary container to parse the new body
      const tempDiv = doc.createElement("div");
      tempDiv.innerHTML = newBody;

      // Morph each child of body rather than body itself to preserve body attributes
      morphdom(doc.body, `<body${bodyAttrs}>${newBody}</body>`, {
        onBeforeElUpdated: (fromEl, toEl) => {
          // Don't update elements that are focused (preserves input state)
          if (fromEl === doc.activeElement && fromEl.tagName === "INPUT") {
            return false;
          }
          // Skip identical elements
          if (fromEl.isEqualNode(toEl)) {
            return false;
          }
          return true;
        },
        childrenOnly: false,
      });
    } catch (e) {
      // Fallback: full write if morphdom fails
      console.warn("morphdom patch failed, falling back to full write", e);
      fullWrite(htmlContent);
      return;
    }

    // Update inline styles in <head> (not external resources — those trigger fullWrite)
    const currentHead = doc.head;
    if (currentHead) {
      // Update <style> tags and <meta> tags
      const newHeadDoc = new DOMParser().parseFromString(`<html><head>${newHead}</head><body></body></html>`, "text/html");
      
      // Replace inline <style> tags
      const oldStyles = currentHead.querySelectorAll("style");
      const newStyles = newHeadDoc.head.querySelectorAll("style");
      
      oldStyles.forEach((s, i) => {
        if (newStyles[i] && s.textContent !== newStyles[i].textContent) {
          s.textContent = newStyles[i].textContent;
        }
      });
      // Add any new style tags
      if (newStyles.length > oldStyles.length) {
        for (let i = oldStyles.length; i < newStyles.length; i++) {
          const cloned = doc.createElement("style");
          cloned.textContent = newStyles[i].textContent;
          currentHead.appendChild(cloned);
        }
      }

      // Update <title>
      const newTitle = newHeadDoc.head.querySelector("title");
      if (newTitle && doc.title !== newTitle.textContent) {
        doc.title = newTitle.textContent || "";
      }
    }

    prevHtmlRef.current = htmlContent;
  }, [fullWrite]);

  useEffect(() => {
    if (!html) {
      isInitializedRef.current = false;
      prevHtmlRef.current = null;
      prevResourceKeyRef.current = "";
      return;
    }

    // Skip if html hasn't changed
    if (html === prevHtmlRef.current) return;

    const { head } = parseHtmlParts(html);
    const newResourceKey = getResourceKey(head);

    // Decide: full write or patch
    if (!isInitializedRef.current || !iframeRef.current?.contentDocument?.body) {
      // First render — full write
      // Use a small delay to ensure iframe is mounted
      requestAnimationFrame(() => fullWrite(html));
    } else if (newResourceKey !== prevResourceKeyRef.current) {
      // External resources changed (new CDN, new script) — must full reload
      fullWrite(html);
    } else {
      // Same resources — safe to patch
      patchUpdate(html);
    }
  }, [html, fullWrite, patchUpdate]);

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
          {isStreaming && (
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
          className={`bg-card border border-border rounded-lg shadow-sm transition-all duration-300 h-full ${
            isMobile ? "w-[375px]" : "w-full"
          }`}
          title="Live Preview"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
};

export default LivePreview;