export interface AppProject {
  id: string;
  name: string;
  description: string;
  html: string;
  domain: string;
  publishedUrl: string | null;
  visibility: "public" | "private";
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "appforge_projects";

function readAll(): AppProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(projects: AppProject[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function getProjects(): AppProject[] {
  return readAll().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getProject(id: string): AppProject | null {
  return readAll().find((p) => p.id === id) || null;
}

export function createProject(name: string, html: string): AppProject {
  const project: AppProject = {
    id: crypto.randomUUID(),
    name,
    description: "",
    html,
    domain: "",
    publishedUrl: null,
    visibility: "public",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const all = readAll();
  all.push(project);
  writeAll(all);
  return project;
}

export function updateProject(id: string, updates: Partial<Omit<AppProject, "id" | "createdAt">>): AppProject | null {
  const all = readAll();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
  writeAll(all);
  return all[idx];
}

export function deleteProject(id: string): boolean {
  const all = readAll();
  const filtered = all.filter((p) => p.id !== id);
  if (filtered.length === all.length) return false;
  writeAll(filtered);
  return true;
}
