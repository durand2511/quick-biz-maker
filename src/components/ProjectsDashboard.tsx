import { useState } from "react";
import { Plus, Trash2, ExternalLink, Clock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type AppProject, getProjects, deleteProject } from "@/lib/projects";
import { toast } from "sonner";

interface Props {
  onNewProject: () => void;
  onOpenProject: (project: AppProject) => void;
}

const ProjectsDashboard = ({ onNewProject, onOpenProject }: Props) => {
  const [projects, setProjects] = useState<AppProject[]>(getProjects());

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Weet je zeker dat je "${name}" wilt verwijderen?`)) return;
    deleteProject(id);
    setProjects(getProjects());
    toast.success(`"${name}" verwijderd`);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Zojuist";
    if (mins < 60) return `${mins} min geleden`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} uur geleden`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} ${days === 1 ? "dag" : "dagen"} geleden`;
    return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold">Mijn Projecten</h1>
          <Button onClick={onNewProject} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Nieuw project
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {projects.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">Nog geen projecten</h2>
            <p className="text-muted-foreground text-sm">Maak je eerste app met AI</p>
            <Button onClick={onNewProject}>
              <Plus className="h-4 w-4 mr-1.5" />
              Begin met bouwen
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <div
                key={p.id}
                className="group rounded-xl border border-border bg-card hover:border-primary/40 transition-colors cursor-pointer overflow-hidden"
                onClick={() => onOpenProject(p)}
              >
                {/* Preview thumbnail */}
                <div className="h-36 bg-secondary/50 border-b border-border relative overflow-hidden">
                  <iframe
                    srcDoc={p.html}
                    className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none"
                    title={p.name}
                    sandbox=""
                  />
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm truncate flex-1">{p.name || "Naamloos project"}</h3>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {p.publishedUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => { e.stopPropagation(); window.open(p.publishedUrl!, "_blank"); }}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.name); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(p.updatedAt)}
                    </span>
                    {p.publishedUrl && (
                      <span className="flex items-center gap-1 text-primary">
                        <Globe className="h-3 w-3" />
                        Live
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ProjectsDashboard;
