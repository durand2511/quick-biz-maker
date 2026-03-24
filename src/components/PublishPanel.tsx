import { useState } from "react";
import { Globe, Copy, ExternalLink, CheckCircle2, X, Eye, EyeOff, Info, Clock, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { AppProject, DomainStatus } from "@/lib/projects";

interface Props {
  project: AppProject;
  html: string;
  onUpdate: (updates: Partial<AppProject>) => void;
  onClose: () => void;
}

const DomainStatusBadge = ({ status }: { status: DomainStatus }) => {
  switch (status) {
    case "connected":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
          <CheckCircle2 className="h-3 w-3" /> Verbonden
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">
          <Clock className="h-3 w-3" /> Wacht op configuratie
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
          <AlertCircle className="h-3 w-3" /> Niet geconfigureerd
        </span>
      );
  }
};

const PublishPanel = ({ project, html, onUpdate, onClose }: Props) => {
  const [appName, setAppName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [domain, setDomain] = useState(project.domain);
  const [visibility, setVisibility] = useState(project.visibility);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showDnsSetup, setShowDnsSetup] = useState(false);

  const domainStatus: DomainStatus = project.domainStatus || "none";
  const hasDomain = domain.trim().length > 0;

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
        domainStatus: domain.trim() ? (domainStatus === "connected" ? "connected" : "pending") : "none",
      });

      toast.success("App gepubliceerd!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publiceren mislukt");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveDomain = () => {
    const newStatus: DomainStatus = domain.trim() ? "pending" : "none";
    onUpdate({ domain, domainStatus: newStatus });
    if (domain.trim()) {
      toast.success("Domein opgeslagen — volg de DNS-instructies om te verbinden");
      setShowDnsSetup(true);
    } else {
      toast.success("Domein verwijderd");
      setShowDnsSetup(false);
    }
  };

  const handleMarkConnected = () => {
    onUpdate({ domain, domainStatus: "connected" });
    toast.success("Domein gemarkeerd als verbonden!");
  };

  const handleSave = () => {
    onUpdate({ name: appName, description, visibility });
    toast.success("Instellingen opgeslagen");
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Gekopieerd!");
    } catch {
      toast.error("Kopiëren mislukt");
    }
  };

  const cnameTarget = project.publishedUrl
    ? new URL(project.publishedUrl).hostname
    : "jouw-app.supabase.co";

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
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Live URL</Label>
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-4 py-3">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm text-foreground truncate flex-1">{project.publishedUrl}</p>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyText(project.publishedUrl!)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(project.publishedUrl!, "_blank")}>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
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

          {/* Custom Domain Section */}
          <div className="space-y-3 rounded-xl border border-border bg-secondary/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Eigen domein</Label>
              </div>
              <DomainStatusBadge status={hasDomain ? domainStatus : "none"} />
            </div>

            <div className="flex gap-2">
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="bijv. mijnapp.nl"
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={handleSaveDomain} className="shrink-0">
                Opslaan
              </Button>
            </div>

            {hasDomain && domainStatus === "pending" && (
              <p className="text-xs text-yellow-400/80 flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Domein opgeslagen — configureer je DNS om te verbinden
              </p>
            )}

            {hasDomain && domainStatus === "connected" && (
              <p className="text-xs text-green-400/80 flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3" />
                Domein is verbonden met je app
              </p>
            )}

            {/* DNS Setup Toggle */}
            {hasDomain && (
              <button
                onClick={() => setShowDnsSetup(!showDnsSetup)}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
              >
                <Info className="h-3.5 w-3.5" />
                DNS-instructies {showDnsSetup ? "verbergen" : "bekijken"}
                {showDnsSetup ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}

            {/* DNS Setup Panel */}
            {showDnsSetup && hasDomain && (
              <div className="rounded-lg border border-border bg-background/50 p-4 text-sm space-y-4">
                <p className="font-medium text-foreground">Verbind <span className="text-primary">{domain}</span> met je app</p>

                <div className="space-y-3">
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Stappen</p>
                  <ol className="space-y-3 text-muted-foreground list-none">
                    <li className="flex gap-3">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">1</span>
                      <span>Log in bij je domeinprovider (bijv. <span className="text-foreground font-medium">IONOS</span>, Cloudflare, TransIP)</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">2</span>
                      <span>Ga naar <span className="text-foreground font-medium">DNS-instellingen</span> voor {domain}</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">3</span>
                      <div className="space-y-2">
                        <span>Voeg een <span className="text-foreground font-medium">A-record</span> toe:</span>
                        <div className="flex items-center gap-2 font-mono text-xs bg-background rounded-md border border-border px-3 py-2">
                          <span className="text-muted-foreground">Type:</span> <span className="text-foreground">A</span>
                          <span className="text-muted-foreground ml-2">Naam:</span> <span className="text-foreground">@</span>
                          <span className="text-muted-foreground ml-2">Waarde:</span> <span className="text-primary">185.158.133.1</span>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-auto" onClick={() => copyText("185.158.133.1")}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">4</span>
                      <div className="space-y-2">
                        <span>Voeg een <span className="text-foreground font-medium">CNAME-record</span> toe voor www:</span>
                        <div className="flex items-center gap-2 font-mono text-xs bg-background rounded-md border border-border px-3 py-2">
                          <span className="text-muted-foreground">Type:</span> <span className="text-foreground">CNAME</span>
                          <span className="text-muted-foreground ml-2">Naam:</span> <span className="text-foreground">www</span>
                          <span className="text-muted-foreground ml-2">Waarde:</span> <span className="text-primary truncate max-w-[140px]">{cnameTarget}</span>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-auto" onClick={() => copyText(cnameTarget)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">5</span>
                      <span>Wacht tot DNS is doorgevoerd <span className="text-muted-foreground">(kan tot 72 uur duren)</span></span>
                    </li>
                  </ol>
                </div>

                {domainStatus === "pending" && (
                  <Button variant="outline" size="sm" className="w-full" onClick={handleMarkConnected}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                    Ik heb de DNS ingesteld — markeer als verbonden
                  </Button>
                )}

                <p className="text-xs text-muted-foreground">
                  💡 Je domein blijft gekoppeld aan dit project, ook na updates.
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
