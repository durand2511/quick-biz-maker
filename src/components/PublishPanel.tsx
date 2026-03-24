import { useState } from "react";
import { Globe, Copy, ExternalLink, CheckCircle2, X, Eye, EyeOff, Clock, AlertCircle, ChevronDown, ChevronUp, ShoppingCart, Link2 } from "lucide-react";
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

const StatusBadge = ({ status }: { status: DomainStatus }) => {
  const map = {
    connected: { icon: CheckCircle2, label: "Verbonden", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
    pending: { icon: Clock, label: "Wacht op verbinding", cls: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
    none: { icon: AlertCircle, label: "Niet geconfigureerd", cls: "bg-muted text-muted-foreground border-border" },
  };
  const { icon: Icon, label, cls } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cls}`}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
};

const PublishPanel = ({ project, html, onUpdate, onClose }: Props) => {
  const [appName, setAppName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [domain, setDomain] = useState(project.domain);
  const [visibility, setVisibility] = useState(project.visibility);
  const [isPublishing, setIsPublishing] = useState(false);
  const [domainMode, setDomainMode] = useState<"idle" | "connect">(project.domain && project.domainStatus === "pending" ? "connect" : "idle");

  const domainStatus: DomainStatus = project.domainStatus || "none";
  const hasDomain = domain.trim().length > 0;

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/publish-app`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ html }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Publiceren mislukt");
      onUpdate({ name: appName, description, domain, visibility, publishedUrl: data.url, domainStatus: hasDomain ? (domainStatus === "connected" ? "connected" : "pending") : "none" });
      toast.success("App gepubliceerd!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publiceren mislukt");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSave = () => {
    onUpdate({ name: appName, description, visibility });
    toast.success("Instellingen opgeslagen");
  };

  const copyText = async (t: string) => {
    try { await navigator.clipboard.writeText(t); toast.success("Gekopieerd!"); } catch { toast.error("Kopiëren mislukt"); }
  };

  const handleBuyDomain = () => {
    toast.info("Je wordt doorgestuurd naar IONOS om een domein te kopen.");
    window.open("https://www.ionos.nl/domein-registreren", "_blank");
  };

  const handleSaveDomain = () => {
    const s: DomainStatus = domain.trim() ? "pending" : "none";
    onUpdate({ domain, domainStatus: s });
    if (domain.trim()) { toast.success("Domein opgeslagen — volg de stappen om te verbinden"); setDomainMode("connect"); }
    else { toast.success("Domein verwijderd"); setDomainMode("idle"); }
  };

  const handleMarkConnected = () => {
    onUpdate({ domain, domainStatus: "connected" });
    toast.success("Domein gemarkeerd als verbonden!");
  };

  const cnameTarget = project.publishedUrl ? new URL(project.publishedUrl).hostname : "jouw-app.supabase.co";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Publiceren</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Live URL */}
          {project.publishedUrl && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Live URL</Label>
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-4 py-3">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm text-foreground truncate flex-1">{project.publishedUrl}</p>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copyText(project.publishedUrl!)}><Copy className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(project.publishedUrl!, "_blank")}><ExternalLink className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          )}

          {/* App Name + Description */}
          <div className="space-y-2">
            <Label htmlFor="app-name">App naam</Label>
            <Input id="app-name" value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="Mijn App" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="app-desc">Beschrijving</Label>
            <Input id="app-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Korte beschrijving..." />
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label>Zichtbaarheid</Label>
            <div className="flex gap-2">
              {(["public", "private"] as const).map((v) => (
                <button key={v} onClick={() => setVisibility(v)}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors ${visibility === v ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  {v === "public" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {v === "public" ? "Openbaar" : "Privé"}
                </button>
              ))}
            </div>
          </div>

          {/* Domain Section */}
          <div className="space-y-3 rounded-xl border border-border bg-secondary/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Eigen domein</Label>
              </div>
              <StatusBadge status={hasDomain ? domainStatus : "none"} />
            </div>

            <div className="flex gap-2">
              <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="bijv. mijnapp.nl" className="flex-1" />
              <Button variant="outline" size="sm" onClick={handleSaveDomain} className="shrink-0">Opslaan</Button>
            </div>

            {/* Action buttons */}
            {domainMode === "idle" && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={handleBuyDomain}>
                  <ShoppingCart className="h-3.5 w-3.5 mr-1.5" /> Domein kopen
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setDomainMode("connect")}>
                  <Link2 className="h-3.5 w-3.5 mr-1.5" /> Bestaand domein koppelen
                </Button>
              </div>
            )}

            {/* Pending hint */}
            {hasDomain && domainStatus === "pending" && domainMode !== "connect" && (
              <p className="text-xs text-amber-400/80 flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> Configureer je DNS om te verbinden
              </p>
            )}

            {/* Connected hint */}
            {hasDomain && domainStatus === "connected" && (
              <p className="text-xs text-emerald-400/80 flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3" /> Domein is verbonden met je app
              </p>
            )}

            {/* Connect flow toggle */}
            {domainMode === "connect" && (
              <button onClick={() => setDomainMode("idle")} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium">
                <ChevronUp className="h-3 w-3" /> DNS-instructies verbergen
              </button>
            )}

            {/* DNS Setup Panel */}
            {domainMode === "connect" && (
              <div className="rounded-lg border border-border bg-background/50 p-4 text-sm space-y-4">
                <p className="font-medium text-foreground">
                  Verbind {hasDomain ? <span className="text-primary">{domain}</span> : "je domein"} met je app
                </p>

                <ol className="space-y-3 text-muted-foreground list-none">
                  {[
                    <>Log in bij je domeinprovider (bijv. <span className="text-foreground font-medium">IONOS</span>, Cloudflare, TransIP)</>,
                    <>Ga naar <span className="text-foreground font-medium">DNS-instellingen</span>{hasDomain ? ` voor ${domain}` : ""}</>,
                  ].map((text, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                      <span>{text}</span>
                    </li>
                  ))}

                  {/* A record */}
                  <li className="flex gap-3">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">3</span>
                    <div className="space-y-2 flex-1">
                      <span>Voeg een <span className="text-foreground font-medium">A-record</span> toe:</span>
                      <div className="flex items-center gap-2 font-mono text-xs bg-background rounded-md border border-border px-3 py-2">
                        <span className="text-muted-foreground">Type:</span> <span className="text-foreground">A</span>
                        <span className="text-muted-foreground ml-2">Naam:</span> <span className="text-foreground">@</span>
                        <span className="text-muted-foreground ml-2">Waarde:</span> <span className="text-primary">185.158.133.1</span>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-auto" onClick={() => copyText("185.158.133.1")}><Copy className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  </li>

                  {/* CNAME record */}
                  <li className="flex gap-3">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">4</span>
                    <div className="space-y-2 flex-1">
                      <span>Voeg een <span className="text-foreground font-medium">CNAME-record</span> toe voor www:</span>
                      <div className="flex items-center gap-2 font-mono text-xs bg-background rounded-md border border-border px-3 py-2">
                        <span className="text-muted-foreground">Type:</span> <span className="text-foreground">CNAME</span>
                        <span className="text-muted-foreground ml-2">Naam:</span> <span className="text-foreground">www</span>
                        <span className="text-muted-foreground ml-2">Waarde:</span> <span className="text-primary truncate max-w-[120px]">{cnameTarget}</span>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-auto" onClick={() => copyText(cnameTarget)}><Copy className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  </li>

                  <li className="flex gap-3">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">5</span>
                    <span>Wacht tot DNS is doorgevoerd <span className="text-muted-foreground">(max 72 uur)</span></span>
                  </li>
                </ol>

                {hasDomain && domainStatus === "pending" && (
                  <Button variant="outline" size="sm" className="w-full" onClick={handleMarkConnected}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Ik heb DNS ingesteld — markeer als verbonden
                  </Button>
                )}

                <p className="text-xs text-muted-foreground">💡 Je domein blijft gekoppeld, ook na app-updates.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-border px-6 py-4">
          <Button variant="outline" className="flex-1" onClick={handleSave}>Opslaan</Button>
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
