import { NavLink } from "react-router-dom";
import { Sparkles, Menu, Search } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { NotificationBell } from "@/components/assistant/NotificationBell";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

const MOBILE_NAV = [
  { to: "/opportunities", label: "Opportunities" },
  { to: "/overview", label: "Discover" },
  { to: "/automations", label: "Automations" },
  { to: "/insights", label: "Insights" },
];

function CommandKbd() {
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  return (
    <kbd className="hidden rounded-md border border-ink-200/80 bg-ink-50 px-1.5 py-0.5 font-mono text-[10px] text-ink-400 sm:inline">
      {isMac ? "⌘K" : "Ctrl K"}
    </kbd>
  );
}

export function Header() {
  const { setAssistantOpen, setCommandPaletteOpen } = useApp();

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/60 bg-white/70 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <NavLink to="/" className="lg:hidden">
          <Logo showWordmark={false} size={28} />
        </NavLink>

        {/* Mobile nav (scrollable) */}
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto lg:hidden">
          {MOBILE_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium",
                  isActive
                    ? "bg-moss-50 text-moss-700"
                    : "text-ink-500 hover:text-ink-800"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Command palette trigger — desktop */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="hidden max-w-xs flex-1 items-center gap-2 rounded-xl border border-ink-200/70 bg-white/80 px-3 py-1.5 text-left shadow-soft transition-all duration-200 ease-smooth hover:border-ink-300/70 hover:bg-white focus-ring lg:flex"
        >
          <Search size={15} className="shrink-0 text-ink-400" />
          <span className="flex-1 font-mono text-xs text-ink-400">
            Jump to…
          </span>
          <CommandKbd />
        </button>

        <div className="flex flex-1 lg:hidden" />

        <button
          onClick={() => setCommandPaletteOpen(true)}
          aria-label="Open command palette"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200/70 bg-white text-ink-500 shadow-soft transition-colors hover:bg-ink-50 lg:hidden"
        >
          <Search size={16} />
        </button>

        <button
          onClick={() => setAssistantOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-moss-200/70 bg-gradient-to-b from-moss-50 to-moss-100/60 px-3 py-1.5 text-sm font-medium text-moss-700 shadow-soft transition-all duration-200 ease-smooth hover:border-moss-300/70 hover:to-moss-100 active:scale-[0.98] focus-ring"
        >
          <Sparkles size={15} />
          <span className="hidden sm:inline">Assistant</span>
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-moss-500 opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-moss-500" />
          </span>
        </button>

        <NotificationBell />

        <button
          aria-label="Account"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-b from-ink-700 to-ink-900 text-sm font-semibold text-white shadow-btn-primary ring-1 ring-inset ring-white/10 transition-transform duration-200 ease-smooth hover:scale-105 focus-ring"
        >
          AK
        </button>

        <button
          aria-label="Menu"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-500 hover:bg-ink-100 lg:hidden"
        >
          <Menu size={18} />
        </button>
      </div>
    </header>
  );
}
