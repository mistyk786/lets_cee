import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Monospace, numbered section eyebrow with a hairline lead-in — the recurring
 * "field manual" motif used to title sections across SLOTH.
 *
 *   01 ──  DETECTED WORKFLOW
 */
export function SectionLabel({
  index,
  children,
  className,
  tone = "muted",
}: {
  index?: string;
  children: ReactNode;
  className?: string;
  tone?: "muted" | "moss";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-label",
        className
      )}
    >
      {index && (
        <span
          className={cn(
            "tnum font-medium",
            tone === "moss" ? "text-moss-600" : "text-moss-600/90"
          )}
        >
          {index}
        </span>
      )}
      <span className="h-px w-6 bg-ink-300/60" />
      <span className="text-ink-400">{children}</span>
    </div>
  );
}
