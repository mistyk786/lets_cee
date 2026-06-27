import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  hint,
  trend,
  sub,
  className,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon?: LucideIcon;
  hint?: string;
  trend?: number;
  sub?: string;
  className?: string;
}) {
  return (
    <div className={cn("card group p-5", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <p className="font-mono text-[10.5px] uppercase tracking-label text-ink-400">
            {label}
          </p>
          {hint && <Tooltip content={hint} />}
        </div>
        {Icon && (
          <Icon
            size={17}
            className="text-ink-300 transition-colors duration-200 group-hover:text-moss-500"
          />
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-display text-[2.1rem] font-medium leading-none tracking-tighter tnum text-ink-900">
          {value}
        </span>
        {unit && (
          <span className="font-mono text-xs font-medium text-ink-400">
            {unit}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {sub && (
          <span className="font-mono text-[11px] text-ink-400">{sub}</span>
        )}
        {trend != null && trend !== 0 && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-mono text-[11px] font-medium",
              trend > 0 ? "text-amber-600" : "text-moss-600"
            )}
          >
            {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}% vs last
          </span>
        )}
      </div>
    </div>
  );
}
