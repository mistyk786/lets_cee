import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { formatRelativeDate } from "@/lib/utils";

export function NotificationBell() {
  const { notifications, unreadCount, markNotificationRead, markAllRead } =
    useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800 focus-ring"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-moss-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-moss-600 ring-2 ring-white" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-lift animate-fade-in">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <p className="text-sm font-semibold text-ink-900">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-moss-600 hover:text-moss-700"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-ink-400">
                You're all caught up.
              </p>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  markNotificationRead(n.id);
                  setOpen(false);
                  if (n.opportunityId)
                    navigate(`/opportunities/${n.opportunityId}`);
                }}
                className="flex w-full gap-3 border-b border-ink-50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-ink-50"
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    n.read ? "bg-transparent" : "bg-moss-500"
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-800">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">
                    {n.message}
                  </p>
                  {n.recoverableMinutesPerWeek != null && (
                    <p className="mt-1 text-xs font-medium text-moss-600">
                      Recoverable: {n.recoverableMinutesPerWeek} min/week
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-ink-400">
                    {formatRelativeDate(n.createdAt)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
