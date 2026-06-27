import { Sparkles, User } from "lucide-react";
import type { InboxMode } from "@/lib/inboxMode";
import { cn } from "@/lib/utils";

type Props = {
  mode: InboxMode;
  onChange: (mode: InboxMode) => void;
  demoAvailable?: boolean;
  className?: string;
};

export function InboxModeSelector({
  mode,
  onChange,
  demoAvailable = true,
  className,
}: Props) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      <button
        type="button"
        onClick={() => onChange("demo")}
        className={cn(
          "rounded-2xl border p-4 text-left transition-all",
          mode === "demo"
            ? "border-moss-400 bg-moss-50 shadow-soft ring-1 ring-moss-200"
            : "border-ink-200 bg-white/80 hover:border-ink-300"
        )}
      >
        <div className="flex items-center gap-2">
          <Sparkles
            size={18}
            className={mode === "demo" ? "text-moss-600" : "text-ink-400"}
          />
          <span className="text-sm font-semibold text-ink-900">Try demo inbox</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          Explore Sloth on our pre-connected Gmail — no login required.
          {demoAvailable
            ? " Real messages, real AI analysis."
            : " Demo inbox not configured on this server."}
        </p>
      </button>

      <button
        type="button"
        onClick={() => onChange("own")}
        className={cn(
          "rounded-2xl border p-4 text-left transition-all",
          mode === "own"
            ? "border-moss-400 bg-moss-50 shadow-soft ring-1 ring-moss-200"
            : "border-ink-200 bg-white/80 hover:border-ink-300"
        )}
      >
        <div className="flex items-center gap-2">
          <User
            size={18}
            className={mode === "own" ? "text-moss-600" : "text-ink-400"}
          />
          <span className="text-sm font-semibold text-ink-900">Use your email</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          Connect your Gmail, Outlook, or iCloud with an app password and analyse
          your own inbox + sent mail.
        </p>
      </button>
    </div>
  );
}
