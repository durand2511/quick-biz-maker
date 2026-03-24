import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Smartphone, Monitor, Globe, FileDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  html: string | null;
}

const LivePreview = ({ html }: Props) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

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

  const handlePublish = async () => {
    if (!html) return;
    setIsPublishing(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/publish-app`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ html }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Publiceren mislukt");

      const publicUrl = data.url;
      await navigator.clipboard.writeText(publicUrl);
      toast.success("App gepubliceerd! URL gekopieerd naar klembord.", {
        description: publicUrl,
        duration: 8000,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publiceren mislukt");
    } finally {
      setIsPublishing(false);
    }
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
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-destructive/50" />
          <div className="w-3 h-3 rounded-full bg-accent-foreground/20" />
          <div className="w-3 h-3 rounded-full bg-accent-foreground/15" />
          <span className="text-xs text-muted-foreground ml-3">Preview</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setIsMobile(false)}
          >
            <Monitor className={`h-3.5 w-3.5 ${!isMobile ? "text-foreground" : "text-muted-foreground"}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setIsMobile(true)}
          >
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
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            variant="default"
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={handlePublish}
            disabled={isPublishing}
          >
            <Globe className="h-3 w-3 mr-1" />
            {isPublishing ? "Publiceren..." : "Publiceer"}
          </Button>
        </div>
      </div>

      {/* iframe */}
      <div className="flex-1 flex items-start justify-center p-4 overflow-auto">
        <iframe
          srcDoc={html}
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
