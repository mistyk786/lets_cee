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
    <div className={cn("card p-5", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-ink-500">{label}</p>
          {hint && <Tooltip content={hint} />}
        </div>
        {Icon && <Icon size={18} className="text-ink-300" />}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tracking-tight text-ink-900">
          {value}
        </span>
        {unit && <span className="text-sm font-medium text-ink-400">{unit}</span>}
      </div>
      <div className="mt-1 flex items-center gap-2">
        {sub && <span className="text-xs text-ink-400">{sub}</span>}
        {trend != null && trend !== 0 && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium",
              trend > 0 ? "text-amber-600" : "text-moss-600"
            )}
          >
            {trend > 0 ? (
              <TrendingUp size={12} />
            ) : (
              <TrendingDown size={12} />
            )}
            {Math.abs(trend)}% vs last period
          </span>
        )}
      </div>
    </div>
  );
}
