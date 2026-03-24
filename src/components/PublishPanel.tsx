import { useState } from "react";
import { Globe, Copy, ExternalLink, CheckCircle2, X, Eye, EyeOff, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { AppProject } from "@/lib/projects";

interface Props {
  project: AppProject;
  html: string;
  onUpdate: (updates: Partial<AppProject>) => void;
  onClose: () => void;
}

const PublishPanel = ({ project, html, onUpdate, onClose }: Props) => {
  const [appName, setAppName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [domain, setDomain] = useState(project.domain);
  const [visibility, setVisibility] = useState(project.visibility);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showDnsHelp, setShowDnsHelp] = useState(false);

  const handlePublish = async () => {
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

      onUpdate({
        name: appName,
        description,
        domain,
        visibility,
        publishedUrl: data.url,
      });

      toast.success("App gepubliceerd!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publiceren mislukt");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSave = () => {
    onUpdate({ name: appName, description, domain, visibility });
    toast.success("Instellingen opgeslagen");
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link gekopieerd!");
    } catch {
      toast.error("Kopiëren mislukt");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Publiceren</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Published URL */}
          {project.publishedUrl && (
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-4 py-3">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm text-foreground truncate flex-1">{project.publishedUrl}</p>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyUrl(project.publishedUrl!)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(project.publishedUrl!, "_blank")}>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* App Name */}
          <div className="space-y-2">
            <Label htmlFor="app-name">App naam</Label>
            <Input id="app-name" value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="Mijn App" />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="app-desc">Beschrijving</Label>
            <Input id="app-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Korte beschrijving van je app..." />
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label>Zichtbaarheid</Label>
            <div className="flex gap-2">
              <button
                onClick={() => setVisibility("public")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                  visibility === "public" ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="h-4 w-4" /> Openbaar
              </button>
              <button
                onClick={() => setVisibility("private")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                  visibility === "private" ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <EyeOff className="h-4 w-4" /> Privé
              </button>
            </div>
          </div>

          {/* Domain */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="app-domain">Eigen domein</Label>
              <button onClick={() => setShowDnsHelp(!showDnsHelp)} className="text-muted-foreground hover:text-primary transition-colors">
                <Info className="h-3.5 w-3.5" />
              </button>
            </div>
            <Input id="app-domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="mijnapp.nl" />

            {showDnsHelp && (
              <div className="rounded-lg border border-border bg-secondary/50 p-4 text-sm space-y-3">
                <p className="font-medium text-foreground">Eigen domein koppelen via IONOS:</p>
                <ol className="space-y-2 text-muted-foreground list-decimal list-inside">
                  <li>Log in bij <span className="text-foreground font-medium">IONOS</span> en ga naar <span className="text-foreground">Domeinen &amp; SSL</span></li>
                  <li>Klik op je domein en ga naar <span className="text-foreground">DNS-instellingen</span></li>
                  <li>Voeg een <span className="text-foreground font-medium">A-record</span> toe:
                    <div className="ml-4 mt-1 font-mono text-xs bg-background/50 rounded px-2 py-1">
                      Type: A | Naam: @ | Waarde: 185.158.133.1
                    </div>
                  </li>
                  <li>Voeg een <span className="text-foreground font-medium">CNAME-record</span> toe voor www:
                    <div className="ml-4 mt-1 font-mono text-xs bg-background/50 rounded px-2 py-1">
                      Type: CNAME | Naam: www | Waarde: jouwdomein.nl
                    </div>
                  </li>
                  <li>Wacht tot de DNS-wijzigingen zijn doorgevoerd <span className="text-muted-foreground">(max 72 uur)</span></li>
                </ol>
                <p className="text-xs text-muted-foreground">
                  💡 Je domein blijft gekoppeld aan deze app, ook als je de app bijwerkt.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-border px-6 py-4">
          <Button variant="outline" className="flex-1" onClick={handleSave}>
            Opslaan
          </Button>
          <Button className="flex-1" onClick={handlePublish} disabled={isPublishing}>
            <Globe className="h-4 w-4 mr-2" />
            {isPublishing ? "Publiceren..." : project.publishedUrl ? "Opnieuw publiceren" : "Publiceer"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PublishPanel;
