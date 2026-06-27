import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Inbox,
  Zap,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/opportunities", label: "Opportunities", icon: Inbox },
  { to: "/overview", label: "Discover", icon: LayoutDashboard },
  { to: "/automations", label: "Active Automations", icon: Zap },
  { to: "/insights", label: "Insights", icon: BarChart3 },
];

export function Sidebar() {
  const { unreadCount } = useApp();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-ink-200/60 bg-white/60 px-3 py-4 backdrop-blur-xl lg:flex">
      <NavLink to="/" className="rounded-lg px-2 py-1.5 focus-ring">
        <Logo />
      </NavLink>

      <nav className="mt-6 flex-1 space-y-0.5">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-smooth focus-ring",
                isActive
                  ? "bg-gradient-to-b from-moss-50 to-moss-100/50 text-moss-700 shadow-soft ring-1 ring-inset ring-moss-200/50"
                  : "text-ink-600 hover:bg-ink-100/70 hover:text-ink-900"
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-moss-600 transition-opacity duration-200",
                    isActive ? "opacity-100" : "opacity-0"
                  )}
                />
                <item.icon
                  size={18}
                  className={cn(
                    "transition-transform duration-200 ease-smooth",
                    !isActive && "group-hover:scale-105"
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {item.to === "/opportunities" && unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-b from-moss-500 to-moss-600 px-1.5 text-[11px] font-semibold text-white shadow-btn-primary">
                    {unreadCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="card highlight-top p-3.5">
        <div className="flex items-center gap-2 text-moss-700">
          <ShieldCheck size={16} />
          <p className="text-xs font-semibold">Approval mode on</p>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-ink-500">
          Nothing is sent and no events are created without your approval.
        </p>
      </div>
    </aside>
  );
}
