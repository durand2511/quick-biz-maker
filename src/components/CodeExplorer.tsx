/**
 * CodeExplorer — File tree + tabbed code view, similar to an IDE.
 * Shows architecture-derived files and the generated HTML code.
 */

import { useState } from "react";
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen, X, Copy } from "lucide-react";
import { toast } from "sonner";
import type { AppArchitecture } from "@/ai/architecture";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileNode[];
  content?: string;
}

interface CodeExplorerProps {
  html: string | null;
  architecture: AppArchitecture | null;
}

/** Build a virtual file tree from architecture */
function buildFileTree(arch: AppArchitecture | null, html: string | null): FileNode[] {
  if (!arch) {
    // No architecture — just show the single HTML file
    return html
      ? [{ name: "app.html", path: "app.html", type: "file", content: html }]
      : [];
  }

  const root: FileNode[] = [];

  // Components folder
  if (arch.structure.components.length > 0) {
    root.push({
      name: "components",
      path: "components",
      type: "folder",
      children: arch.structure.components.map((c) => ({
        name: `${c.name}.js`,
        path: `components/${c.name}.js`,
        type: "file" as const,
        content: generateComponentStub(c),
      })),
    });
  }

  // Pages folder
  if (arch.structure.pages.length > 0) {
    root.push({
      name: "pages",
      path: "pages",
      type: "folder",
      children: arch.structure.pages.map((p) => ({
        name: `${capitalize(slugify(p.name))}Page.js`,
        path: `pages/${capitalize(slugify(p.name))}Page.js`,
        type: "file" as const,
        content: generatePageStub(p, arch),
      })),
    });
  }

  // Layouts folder
  if (arch.structure.layouts.length > 0) {
    root.push({
      name: "layouts",
      path: "layouts",
      type: "folder",
      children: arch.structure.layouts.map((l) => ({
        name: `${l.name}.js`,
        path: `layouts/${l.name}.js`,
        type: "file" as const,
        content: generateLayoutStub(l),
      })),
    });
  }

  // Models folder
  if (arch.structure.data_models.length > 0) {
    root.push({
      name: "models",
      path: "models",
      type: "folder",
      children: arch.structure.data_models.map((m) => ({
        name: `${m.name}.js`,
        path: `models/${m.name}.js`,
        type: "file" as const,
        content: generateModelStub(m),
      })),
    });
  }

  // API folder
  if (arch.structure.api_layer.length > 0) {
    root.push({
      name: "api",
      path: "api",
      type: "folder",
      children: arch.structure.api_layer.map((a) => ({
        name: `${a.name}.js`,
        path: `api/${a.name}.js`,
        type: "file" as const,
        content: generateApiStub(a),
      })),
    });
  }

  // Root files
  if (html) {
    root.push({ name: "app.html", path: "app.html", type: "file", content: html });
  }
  root.push({
    name: "styles.css",
    path: "styles.css",
    type: "file",
    content: generateStylesStub(arch),
  });

  return root;
}

// ── Stub generators ──

function generateComponentStub(c: { name: string; type: string; purpose: string; props: { name: string; type: string }[] }): string {
  const propsStr = c.props.map((p) => `  ${p.name}: ${p.type}`).join(",\n");
  return `/**
 * ${c.name}
 * Type: ${c.type}
 * Purpose: ${c.purpose}
 */

function create${c.name}(props) {
  // Props:
  // ${propsStr.replace(/\n/g, "\n  // ")}

  const el = document.createElement("div");
  el.className = "${c.type}-component";
  el.textContent = props.label || "${c.purpose}";
  return el;
}
`;
}

function generatePageStub(
  p: { name: string; route: string; purpose: string; layout: string; components: string[] },
  arch: AppArchitecture,
): string {
  const imports = p.components.map((c) => `// import { create${c} } from "../components/${c}";`).join("\n");
  return `/**
 * ${p.name} Page
 * Route: ${p.route}
 * Layout: ${p.layout}
 * Purpose: ${p.purpose}
 */

${imports}

function render${capitalize(slugify(p.name))}Page() {
  const container = document.createElement("section");
  container.id = "page-${slugify(p.name)}";

  // Components used:
${p.components.map((c) => `  // - ${c}`).join("\n")}

  return container;
}
`;
}

function generateLayoutStub(l: { name: string; description: string; slots: string[] }): string {
  return `/**
 * ${l.name}
 * ${l.description}
 * Slots: ${l.slots.join(", ")}
 */

function create${l.name}() {
  const layout = document.createElement("div");
  layout.className = "layout-${l.name.toLowerCase()}";

${l.slots.map((s) => `  const ${s} = document.createElement("div");\n  ${s}.className = "slot-${s}";\n  layout.appendChild(${s});`).join("\n\n")}

  return layout;
}
`;
}

function generateModelStub(m: { name: string; fields: { name: string; type: string }[] }): string {
  const fieldsStr = m.fields.map((f) => `  ${f.name}: ${f.type}`).join(",\n");
  return `/**
 * Data Model: ${m.name}
 *
 * Fields:
 * ${fieldsStr.replace(/\n/g, "\n * ")}
 */

const ${m.name}Store = {
  items: JSON.parse(localStorage.getItem("${m.name}") || "[]"),

  getAll() {
    return this.items;
  },

  add(item) {
    this.items.push({ id: Date.now(), ...item });
    this._save();
  },

  remove(id) {
    this.items = this.items.filter(i => i.id !== id);
    this._save();
  },

  _save() {
    localStorage.setItem("${m.name}", JSON.stringify(this.items));
  }
};
`;
}

function generateApiStub(a: { name: string; method: string; description: string }): string {
  return `/**
 * API: ${a.name}
 * Method: ${a.method}
 * ${a.description}
 */

async function ${a.name}(data) {
  // ${a.method} request
  // ${a.description}
  console.log("API call: ${a.method} ${a.name}", data);
  return { success: true };
}
`;
}

function generateStylesStub(arch: AppArchitecture): string {
  const colors = arch.design_system.colors.map((c) => `  --color-${c.name}: ${c.value};`).join("\n");
  return `/* ${arch.app_name} - Design System */

:root {
${colors}
  --border-radius: ${arch.design_system.border_radius};
  --font-family: ${arch.design_system.typography};
}

body {
  font-family: var(--font-family);
  margin: 0;
  padding: 0;
}
`;
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Tree node component ──

function FileTreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: FileNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (node: FileNode) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const isFolder = node.type === "folder";
  const isSelected = selectedPath === node.path;

  return (
    <div>
      <button
        onClick={() => {
          if (isFolder) setExpanded(!expanded);
          else onSelect(node);
        }}
        className={`w-full flex items-center gap-1.5 px-2 py-1 text-xs hover:bg-secondary/80 transition-colors rounded-sm ${
          isSelected ? "bg-secondary text-foreground" : "text-muted-foreground"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {isFolder ? (
          <>
            {expanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
            {expanded ? <FolderOpen className="h-3.5 w-3.5 text-primary shrink-0" /> : <Folder className="h-3.5 w-3.5 text-primary shrink-0" />}
          </>
        ) : (
          <>
            <span className="w-3" />
            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {isFolder && expanded && node.children?.map((child) => (
        <FileTreeNode
          key={child.path}
          node={child}
          depth={depth + 1}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

// ── Main component ──

const CodeExplorer = ({ html, architecture }: CodeExplorerProps) => {
  const fileTree = buildFileTree(architecture, html);
  const [openTabs, setOpenTabs] = useState<FileNode[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const handleSelectFile = (node: FileNode) => {
    if (!openTabs.find((t) => t.path === node.path)) {
      setOpenTabs((prev) => [...prev, node]);
    }
    setActiveTab(node.path);
  };

  const handleCloseTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenTabs((prev) => {
      const updated = prev.filter((t) => t.path !== path);
      if (activeTab === path) {
        setActiveTab(updated.length > 0 ? updated[updated.length - 1].path : null);
      }
      return updated;
    });
  };

  const activeFile = openTabs.find((t) => t.path === activeTab);

  const handleCopy = () => {
    if (activeFile?.content) {
      navigator.clipboard.writeText(activeFile.content);
      toast.success("Code gekopieerd!");
    }
  };

  if (fileTree.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Geen bestanden beschikbaar
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-0">
      {/* File tree sidebar */}
      <div className="w-48 border-r border-border bg-card shrink-0 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Bestanden
        </div>
        {fileTree.map((node) => (
          <FileTreeNode
            key={node.path}
            node={node}
            depth={0}
            selectedPath={activeTab}
            onSelect={handleSelectFile}
          />
        ))}
      </div>

      {/* Code area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tabs */}
        {openTabs.length > 0 && (
          <div className="flex items-center border-b border-border bg-card overflow-x-auto shrink-0">
            {openTabs.map((tab) => (
              <button
                key={tab.path}
                onClick={() => setActiveTab(tab.path)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border-r border-border shrink-0 transition-colors ${
                  activeTab === tab.path
                    ? "bg-background text-foreground border-b-2 border-b-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <FileText className="h-3 w-3" />
                <span>{tab.name}</span>
                <button
                  onClick={(e) => handleCloseTab(tab.path, e)}
                  className="ml-1 hover:bg-secondary rounded p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </button>
            ))}
            {activeFile && (
              <button
                onClick={handleCopy}
                className="ml-auto mr-2 flex items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <Copy className="h-3 w-3" />
                Kopieer
              </button>
            )}
          </div>
        )}

        {/* Code content */}
        {activeFile ? (
          <pre className="flex-1 overflow-auto p-4 text-[11px] font-mono text-foreground bg-card/30 whitespace-pre-wrap break-words leading-relaxed">
            {activeFile.content}
          </pre>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
            Klik op een bestand om de code te bekijken
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeExplorer;
