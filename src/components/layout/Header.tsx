import { NavLink } from "react-router-dom";
import { Sparkles, Menu } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { NotificationBell } from "@/components/assistant/NotificationBell";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

const MOBILE_NAV = [
  { to: "/overview", label: "Overview" },
  { to: "/opportunities", label: "Opportunities" },
  { to: "/automations", label: "Automations" },
  { to: "/insights", label: "Insights" },
];

export function Header() {
  const { setAssistantOpen } = useApp();

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/80 backdrop-blur">
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

        <div className="hidden flex-1 lg:block" />

        <button
          onClick={() => setAssistantOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-moss-200 bg-moss-50 px-3 py-1.5 text-sm font-medium text-moss-700 transition-colors hover:bg-moss-100 focus-ring"
        >
          <Sparkles size={15} />
          <span className="hidden sm:inline">Assistant</span>
          <span className="flex h-1.5 w-1.5 rounded-full bg-moss-500" />
        </button>

        <NotificationBell />

        <button
          aria-label="Account"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-800 text-sm font-semibold text-white focus-ring"
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
