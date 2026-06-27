import { AlertTriangle } from "lucide-react";
import type { Bottleneck } from "@/lib/types";
import { cn } from "@/lib/utils";

const IMPACT = {
  high: { label: "High impact", className: "bg-red-100 text-red-700" },
  medium: { label: "Medium impact", className: "bg-amber-100 text-amber-700" },
  low: { label: "Low impact", className: "bg-ink-100 text-ink-600" },
};

export function BottleneckCard({ bottleneck }: { bottleneck: Bottleneck }) {
  const impact = IMPACT[bottleneck.impact];
  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle
          size={18}
          className={cn(
            "mt-0.5 shrink-0",
            bottleneck.impact === "high" ? "text-red-500" : "text-amber-500"
          )}
        />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-sm font-medium tracking-tight text-ink-900">
              {bottleneck.title}
            </p>
            <span
              className={cn(
                "shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide",
                impact.className
              )}
            >
              {impact.label}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-ink-500">
            {bottleneck.description}
          </p>
          <p className="mt-1.5 font-mono text-[11px] font-medium tnum text-ink-600">
            ~{bottleneck.minutesPerRun} min / run
          </p>
        </div>
      </div>
    </div>
  );
}
