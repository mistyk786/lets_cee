import { Activity, Mail, Radio, Server, Wifi, WifiOff } from "lucide-react";
import type { WatcherStatus } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const SOURCE_LABEL: Record<WatcherStatus["dataSource"], string> = {
  demo: "Demo dataset",
  imap: "Live inbox (IMAP)",
  upload: "Uploaded emails",
  unknown: "Unknown source",
};

const CONNECTION_TONE = {
  mock: "neutral",
  live: "success",
  offline: "warning",
} as const;

const CONNECTION_LABEL = {
  mock: "Demo mode",
  live: "Live backend",
  offline: "Backend offline",
} as const;

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
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
  status: WatcherStatus | null;
  loading?: boolean;
  compact?: boolean;
  className?: string;
};

export function WatcherStatusPanel({
  status,
  loading = false,
  compact = false,
  className,
}: Props) {
  if (loading && !status) {
    return (
      <div
        className={cn(
          "animate-pulse rounded-2xl border border-ink-100 bg-white p-4",
          className
        )}
      >
        <div className="h-4 w-32 rounded bg-ink-100" />
        <div className="mt-3 h-3 w-full rounded bg-ink-50" />
      </div>
    );
  }

  if (!status) return null;

  const ConnectionIcon =
    status.connectionMode === "offline"
      ? WifiOff
      : status.connectionMode === "live"
        ? Wifi
        : Server;

  return (
    <div
      className={cn(
        "rounded-2xl border border-ink-100 bg-white/80 p-4 shadow-soft backdrop-blur-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ConnectionIcon size={16} className="text-moss-600" />
          <p className="font-mono text-[11px] uppercase tracking-label text-ink-500">
            Backend status
          </p>
        </div>
        <Badge tone={CONNECTION_TONE[status.connectionMode]} dot>
          {CONNECTION_LABEL[status.connectionMode]}
        </Badge>
      </div>

      <div
        className={cn(
          "mt-3 grid gap-2",
          compact ? "text-xs" : "text-sm sm:grid-cols-2"
        )}
      >
        <Row
          icon={Mail}
          label="Data source"
          value={SOURCE_LABEL[status.dataSource]}
        />
        <Row
          icon={Radio}
          label="Inbox watcher"
          value={
            status.connectionMode === "mock"
              ? "Not polling (demo)"
              : status.enabled
                ? status.running
                  ? "Scanning"
                  : "Idle"
                : "Disabled"
          }
        />
        {!compact && (
          <>
            <Row
              icon={Activity}
              label="Last scan"
              value={formatWhen(status.lastScanAt)}
            />
            <Row
              icon={Activity}
              label="Next scan"
              value={formatWhen(status.nextScanAt)}
            />
          </>
        )}
      </div>

      {(status.imapConfigured || status.cursorConfigured) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {status.imapConfigured && (
            <span className="rounded-md bg-moss-50 px-2 py-0.5 font-mono text-[10px] text-moss-700">
              IMAP
            </span>
          )}
          {status.cursorConfigured && (
            <span className="rounded-md bg-ink-50 px-2 py-0.5 font-mono text-[10px] text-ink-600">
              AI engine
            </span>
          )}
        </div>
      )}

      {status.workflowName && (
        <p className="mt-3 text-xs text-ink-500">
          Latest workflow:{" "}
          <span className="font-medium text-ink-700">{status.workflowName}</span>
        </p>
      )}

      {status.automationAvailable === false && status.automationSummary && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {status.automationSummary}
        </p>
      )}

      {status.automationAvailable && status.workflowCategory && (
        <p className="mt-2 text-xs text-moss-700">
          Category:{" "}
          <span className="font-medium">{status.workflowCategory}</span>
        </p>
      )}

      {status.lastError && (
        <p className="mt-2 text-xs text-amber-700">{status.lastError}</p>
      )}
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 text-ink-600">
      <Icon size={14} className="mt-0.5 shrink-0 text-ink-400" />
      <div>
        <p className="font-mono text-[10px] uppercase tracking-label text-ink-400">
          {label}
        </p>
        <p className="text-ink-700">{value}</p>
      </div>
    </div>
  );
}
