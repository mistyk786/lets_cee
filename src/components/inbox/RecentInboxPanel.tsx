import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { api } from "@/lib/api";
import type { RecentEmail } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatSender(raw: string): string {
  const name = raw.split("<")[0].trim().replace(/"/g, "");
  return name || raw.split("@")[0] || raw;
}

function formatWhen(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

type Props = {
  limit?: number;
  compact?: boolean;
  className?: string;
};

export function RecentInboxPanel({ limit = 8, compact = false, className }: Props) {
  const [emails, setEmails] = useState<RecentEmail[]>([]);
  const [source, setSource] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.getRecentInbox(limit).then((result) => {
      if (!active) return;
      setEmails(result.emails);
      setSource(result.dataSource);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [limit]);

  if (!api.isLive() && emails.length === 0 && !loading) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-ink-100 bg-white/80 p-4 shadow-soft backdrop-blur-sm",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Mail size={16} className="text-moss-600" />
          <p className="font-mono text-[11px] uppercase tracking-label text-ink-500">
            Recent email on this account
          </p>
        </div>
        {source && (
          <span className="rounded-md bg-ink-50 px-2 py-0.5 font-mono text-[10px] text-ink-500">
            {source === "imap" ? "Live inbox" : source}
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-ink-50" />
          ))}
        </div>
      ) : emails.length === 0 ? (
        <p className="mt-3 text-sm text-ink-500">
          No recent messages found. Check IMAP settings or run a scan.
        </p>
      ) : (
        <ul className={cn("mt-3 space-y-2", compact && "max-h-64 overflow-y-auto")}>
          {emails.map((email, index) => (
            <li
              key={`${email.timestamp}-${email.subject}-${index}`}
              className="rounded-xl border border-ink-100/80 bg-ink-50/40 px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug text-ink-900 line-clamp-2">
                  {email.subject}
                </p>
                <span className="shrink-0 font-mono text-[10px] text-ink-400">
                  {formatWhen(email.timestamp)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-ink-500">
                {formatSender(email.sender)}
              </p>
              {email.preview && !compact && (
                <p className="mt-1 text-xs leading-relaxed text-ink-400 line-clamp-2">
                  {email.preview}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
