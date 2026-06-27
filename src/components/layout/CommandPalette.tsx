import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  Inbox,
  Zap,
  BarChart3,
  Sparkles,
  Play,
  Search,
  ArrowRight,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";

type Command = {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Search;
  action: () => void;
  group: "Navigate" | "Actions";
};

export function CommandPalette() {
  const navigate = useNavigate();
  const { commandPaletteOpen, setCommandPaletteOpen, setAssistantOpen } =
    useApp();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const commands = useMemo<Command[]>(
    () => [
      {
        id: "overview",
        label: "Overview",
        hint: "Workflow analysis dashboard",
        icon: LayoutDashboard,
        group: "Navigate",
        action: () => navigate("/overview"),
      },
      {
        id: "opportunities",
        label: "Opportunities",
        hint: "Review detected optimisations",
        icon: Inbox,
        group: "Navigate",
        action: () => navigate("/opportunities"),
      },
      {
        id: "automations",
        label: "Active Automations",
        hint: "Manage activated workflows",
        icon: Zap,
        group: "Navigate",
        action: () => navigate("/automations"),
      },
      {
        id: "insights",
        label: "Measure Impact",
        hint: "Effectiveness dashboard",
        icon: BarChart3,
        group: "Navigate",
        action: () => navigate("/insights"),
      },
      {
        id: "demo",
        label: "Use Demo Dataset",
        hint: "Start the analysis journey",
        icon: Play,
        group: "Actions",
        action: () => navigate("/setup"),
      },
      {
        id: "assistant",
        label: "Open SLOTH Assistant",
        hint: "Context-aware guidance",
        icon: Sparkles,
        group: "Actions",
        action: () => setAssistantOpen(true),
      },
    ],
    [navigate, setAssistantOpen]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.hint?.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q)
    );
  }, [commands, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [setCommandPaletteOpen]);

  useEffect(() => {
    if (!commandPaletteOpen) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [commandPaletteOpen]);

  function run(command: Command) {
    command.action();
    setCommandPaletteOpen(false);
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[activeIndex]) {
      e.preventDefault();
      run(filtered[activeIndex]);
    } else if (e.key === "Escape") {
      setCommandPaletteOpen(false);
    }
  }

  const groups = ["Navigate", "Actions"] as const;

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[14vh]">
          <motion.div
            className="absolute inset-0 bg-ink-900/25 backdrop-blur-sm"
            onClick={() => setCommandPaletteOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-pop"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <div className="flex items-center gap-3 border-b border-ink-200/70 px-4 py-3">
              <Search size={16} className="shrink-0 text-ink-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Jump to a page or action…"
                className="flex-1 bg-transparent text-sm text-ink-800 placeholder:text-ink-400 focus:outline-none"
              />
              <kbd className="hidden rounded-md border border-ink-200 bg-ink-50 px-1.5 py-0.5 font-mono text-[10px] text-ink-400 sm:inline">
                esc
              </kbd>
            </div>

            <div className="max-h-72 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <p className="px-3 py-6 text-center font-mono text-xs text-ink-400">
                  No matching commands
                </p>
              ) : (
                groups.map((group) => {
                  const items = filtered.filter((c) => c.group === group);
                  if (items.length === 0) return null;
                  return (
                    <div key={group} className="mb-1">
                      <p className="px-2 py-1.5 font-mono text-[10px] uppercase tracking-label text-ink-400">
                        {group}
                      </p>
                      {items.map((cmd) => {
                        const idx = filtered.indexOf(cmd);
                        const active = idx === activeIndex;
                        return (
                          <button
                            key={cmd.id}
                            onClick={() => run(cmd)}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                              active
                                ? "bg-moss-50 text-moss-800"
                                : "text-ink-700 hover:bg-ink-50"
                            )}
                          >
                            <cmd.icon
                              size={16}
                              className={cn(
                                "shrink-0",
                                active ? "text-moss-600" : "text-ink-400"
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">{cmd.label}</p>
                              {cmd.hint && (
                                <p className="truncate text-xs text-ink-400">
                                  {cmd.hint}
                                </p>
                              )}
                            </div>
                            {active && (
                              <ArrowRight size={14} className="text-moss-500" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between border-t border-ink-200/70 bg-ink-50/50 px-4 py-2">
              <span className="font-mono text-[10px] uppercase tracking-label text-ink-400">
                SLOTH command palette
              </span>
              <div className="flex items-center gap-2 font-mono text-[10px] text-ink-400">
                <kbd className="rounded border border-ink-200 bg-white px-1">
                  ↑↓
                </kbd>
                navigate
                <kbd className="rounded border border-ink-200 bg-white px-1">
                  ↵
                </kbd>
                select
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
