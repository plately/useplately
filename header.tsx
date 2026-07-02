import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Node } from "@shared/schema";
import { setDeepLink } from "@/lib/deep-link";
import {
  Search, X, CheckSquare, FileText, Users, Lightbulb, Book,
  FolderOpen, MessageSquare, GitBranch, Map, LayoutDashboard,
  Calendar, Zap, Settings, ArrowRight, Clock, Layers,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────── */
interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: "node" | "room" | "page";
  nodeType?: string;
  href: string;
}

/* ── Icons / labels per type ─────────────────────────── */
const NODE_ICON: Record<string, React.ElementType> = {
  task: CheckSquare, note: FileText, meeting: Users,
  journal: Book, file: FolderOpen, chat: MessageSquare,
  idea: Lightbulb, link: GitBranch,
};
const NODE_COLOR: Record<string, string> = {
  task: "#818cf8", note: "#34d399", meeting: "#fb923c",
  journal: "#38bdf8", file: "#f472b6", chat: "#a78bfa",
  idea: "#c084fc", link: "#fbbf24",
};

const PAGES = [
  { id: "page-dashboard", title: "Dashboard",   subtitle: "Overview & journal",   href: "/dashboard",    icon: LayoutDashboard, color: "#6366f1" },
  { id: "page-tasks",     title: "Tasks",        subtitle: "Kanban & list views",  href: "/tasks",        icon: CheckSquare,     color: "#10b981" },
  { id: "page-chat",      title: "Chat",         subtitle: "Team conversations",   href: "/chat",         icon: MessageSquare,   color: "#a78bfa" },
  { id: "page-calendar",  title: "Calendar",     subtitle: "Meetings & deadlines", href: "/calendar",     icon: Calendar,        color: "#fb923c" },
  { id: "page-graph",     title: "Graph",        subtitle: "Knowledge graph",      href: "/graph",        icon: GitBranch,       color: "#38bdf8" },
  { id: "page-planning",  title: "Planning",     subtitle: "Planning rooms",       href: "/planning",     icon: Map,             color: "#f59e0b" },
  { id: "page-files",     title: "Files",        subtitle: "Documents & assets",   href: "/workspace",    icon: FolderOpen,      color: "#f472b6" },
  { id: "page-settings",  title: "Settings",     subtitle: "Profile & preferences",href: "/profile-settings", icon: Settings,   color: "#64748b" },
];

/* ── Helpers ─────────────────────────────────────────── */
function normalize(s: string) { return s.toLowerCase().replace(/\s+/g, " ").trim(); }
function match(query: string, text: string) { return normalize(text).includes(normalize(query)); }

/* ── Result row ──────────────────────────────────────── */
function ResultRow({
  result, selected, onClick,
}: { result: SearchResult; selected: boolean; onClick: () => void }) {
  let Icon: React.ElementType = Layers;
  let color = "#64748b";

  if (result.type === "node" && result.nodeType) {
    Icon = NODE_ICON[result.nodeType] || Layers;
    color = NODE_COLOR[result.nodeType] || "#64748b";
  } else if (result.type === "room") {
    Icon = Map;
    color = "#f59e0b";
  } else if (result.type === "page") {
    const page = PAGES.find(p => p.id === result.id);
    Icon = page?.icon || LayoutDashboard;
    color = page?.color || "#6366f1";
  }

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors rounded-lg ${
        selected ? "bg-accent" : "hover:bg-accent/60"
      }`}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}20`, color }}
      >
        <Icon size={13} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{result.title}</p>
        {result.subtitle && (
          <p className="text-[11px] text-muted-foreground truncate">{result.subtitle}</p>
        )}
      </div>
      <ArrowRight size={12} className="text-muted-foreground/40 flex-shrink-0" />
    </button>
  );
}

/* ── Group label ─────────────────────────────────────── */
function GroupLabel({ label }: { label: string }) {
  return (
    <div className="px-4 pt-3 pb-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{label}</span>
    </div>
  );
}

/* ── Main component ──────────────────────────────────── */
export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  const { data: nodes = [] } = useQuery<Node[]>({ queryKey: ["/api/nodes"] });

  /* Keyboard shortcut to open */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  /* Focus input when opened */
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  /* Build results */
  const results: { group: string; items: SearchResult[] }[] = [];

  const q = query.trim();

  /* Pages (always shown when no query, or when matching) */
  const matchedPages = PAGES.filter(p => !q || match(q, p.title) || match(q, p.subtitle));
  if (matchedPages.length > 0) {
    results.push({
      group: "Pages",
      items: matchedPages.map(p => ({
        id: p.id, title: p.title, subtitle: p.subtitle, type: "page", href: p.href,
      })),
    });
  }

  /* Planning rooms from localStorage */
  const rooms: SearchResult[] = (() => {
    try {
      const stored = localStorage.getItem("planning-rooms");
      if (!stored) return [];
      const arr = JSON.parse(stored) as { id: string; name: string; description?: string }[];
      return arr
        .filter(r => !q || match(q, r.name) || (r.description && match(q, r.description)))
        .map(r => ({
          id: `room-${r.id}`, title: r.name,
          subtitle: r.description || "Planning room",
          type: "room" as const, href: "/planning",
        }));
    } catch { return []; }
  })();
  if (rooms.length > 0) results.push({ group: "Planning Rooms", items: rooms });

  /* Route helper — each node type goes to its native home */
  function nodeHref(n: Node): string {
    switch (n.nodeType) {
      case "task":    return `/tasks`;
      case "file":    return `/workspace`;
      case "chat":    return `/chat`;
      default:        return `/graph`;
    }
  }

  function nodeSubtitle(n: Node): string {
    const dest = n.nodeType === "task" ? "Tasks ↗" : n.nodeType === "file" ? "Files ↗" : n.nodeType === "chat" ? "Chat ↗" : "Graph ↗";
    const tags = n.tags?.length ? ` · ${n.tags.slice(0, 2).join(", ")}` : "";
    return `${n.nodeType}${tags} — opens in ${dest}`;
  }

  /* Nodes */
  if (q) {
    const matched = nodes
      .filter(n => match(q, n.title) || (n.content && match(q, n.content)))
      .slice(0, 10)
      .map(n => ({
        id: `node-${n.id}`, title: n.title,
        subtitle: nodeSubtitle(n),
        type: "node" as const, nodeType: n.nodeType,
        href: nodeHref(n),
      }));
    if (matched.length > 0) results.push({ group: "Nodes", items: matched });
  } else {
    /* Recent nodes when no query */
    const recent = nodes
      .slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
      .map(n => ({
        id: `node-${n.id}`, title: n.title,
        subtitle: nodeSubtitle(n),
        type: "node" as const, nodeType: n.nodeType,
        href: nodeHref(n),
      }));
    if (recent.length > 0) results.push({ group: "Recent Nodes", items: recent });
  }

  /* Flat list for keyboard nav */
  const flat: SearchResult[] = results.flatMap(g => g.items);

  const goTo = useCallback((item: SearchResult) => {
    setOpen(false);
    // Write the deep-link intent BEFORE navigating so the target page picks it up on mount
    if (item.type === "node" && item.nodeType === "task" && item.id) {
      const id = parseInt(item.id.replace("node-", ""), 10);
      if (!isNaN(id)) setDeepLink({ type: "task", id });
    } else if (item.type === "node" && item.nodeType !== "file" && item.nodeType !== "chat" && item.id) {
      const id = parseInt(item.id.replace("node-", ""), 10);
      if (!isNaN(id)) setDeepLink({ type: "node", id });
    }
    navigate(item.href);
  }, [navigate]);

  /* Keyboard nav inside modal */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flat[selectedIdx]) {
      goTo(flat[selectedIdx]);
    }
  };

  /* Reset selection when results change */
  useEffect(() => { setSelectedIdx(0); }, [query]);

  if (!open) return null;

  let flatIdx = 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl mx-4 rounded-2xl shadow-2xl overflow-hidden border border-border/80"
        style={{ background: "var(--background)" }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/60">
          <Search size={16} className="text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, rooms, nodes…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/50 border border-border/40 rounded px-1.5 py-0.5 font-mono">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto py-2">
          {results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search size={24} className="mb-3 opacity-30" />
              <p className="text-sm">No results for "{query}"</p>
            </div>
          )}
          {results.map(group => (
            <div key={group.group}>
              <GroupLabel label={group.group} />
              {group.items.map(item => {
                const idx = flatIdx++;
                return (
                  <div key={item.id} className="px-2">
                    <ResultRow
                      result={item}
                      selected={selectedIdx === idx}
                      onClick={() => goTo(item)}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border/40 bg-muted/20">
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
            <kbd className="border border-border/40 rounded px-1 py-0.5 font-mono">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
            <kbd className="border border-border/40 rounded px-1 py-0.5 font-mono">↵</kbd> open
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
            <kbd className="border border-border/40 rounded px-1 py-0.5 font-mono">esc</kbd> close
          </span>
          <div className="flex-1" />
          <span className="text-[10px] text-muted-foreground/30">{flat.length} result{flat.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
}
