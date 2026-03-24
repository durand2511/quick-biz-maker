import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";

interface Props {
  html: string;
  businessName: string;
}

const AppPreview = ({ html, businessName }: Props) => {
  const handleDownload = () => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${businessName.toLowerCase().replace(/\s+/g, "-")}-app.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePreviewNewTab = () => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Live Preview</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePreviewNewTab}>
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Open
          </Button>
          <Button size="sm" onClick={handleDownload}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download
          </Button>
        </div>
      </div>
      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
        <div className="bg-muted px-4 py-2 flex items-center gap-2 border-b border-border">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-destructive/60" />
            <div className="w-3 h-3 rounded-full bg-accent-foreground/30" />
            <div className="w-3 h-3 rounded-full bg-accent-foreground/20" />
          </div>
          <span className="text-xs text-muted-foreground ml-2">{businessName.toLowerCase().replace(/\s+/g, "")}.com</span>
        </div>
        <iframe
          srcDoc={html}
          className="w-full h-[600px] border-0"
          title="App Preview"
          sandbox="allow-scripts"
        />
      </div>
    </div>
  );
};

export default AppPreview;
