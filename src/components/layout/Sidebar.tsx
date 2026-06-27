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
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/opportunities", label: "Opportunities", icon: Inbox },
  { to: "/automations", label: "Active Automations", icon: Zap },
  { to: "/insights", label: "Insights", icon: BarChart3 },
];

export function Sidebar() {
  const { unreadCount } = useApp();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-ink-200 bg-white px-3 py-4 lg:flex">
      <NavLink to="/" className="px-2 py-1.5 focus-ring rounded-lg">
        <Logo />
      </NavLink>

      <nav className="mt-6 flex-1 space-y-1">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-ring",
                isActive
                  ? "bg-moss-50 text-moss-700"
                  : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
              )
            }
          >
            <item.icon size={18} />
            <span className="flex-1">{item.label}</span>
            {item.to === "/opportunities" && unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-moss-600 px-1.5 text-[11px] font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="rounded-xl border border-moss-100 bg-moss-50/60 p-3">
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
