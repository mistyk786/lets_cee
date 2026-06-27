import { cn } from "@/lib/utils";

export type LedgerStat = {
  value: string;
  label: string;
};

/**
 * A horizontal row of monospace figures divided by hairlines — an "instrument
 * readout" strip. Used on the landing hero and section summaries.
 */
export function StatLedger({
  stats,
  className,
}: {
  stats: LedgerStat[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-stretch divide-x divide-ink-200/70",
        className
      )}
    >
      {stats.map((s) => (
        <div key={s.label} className="px-5 first:pl-0">
          <div className="font-mono text-2xl font-medium tracking-tighter tnum text-ink-900">
            {s.value}
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-label text-ink-400">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
