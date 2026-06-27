import { ProgressBar } from "@/components/ui/Progress";
import { Tooltip } from "@/components/ui/Tooltip";

export type ScoreRow = {
  label: string;
  value: number;
  hint?: string;
  tone?: "moss" | "info" | "warning" | "danger" | "ink";
};

export function ScoreBreakdown({ rows }: { rows: ScoreRow[] }) {
  return (
    <div className="space-y-4">
      {rows.map((row, i) => (
        <div key={row.label}>
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-ink-300">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-label text-ink-500">
                {row.label}
              </span>
              {row.hint && <Tooltip content={row.hint} />}
            </div>
            <span className="font-display text-lg font-medium tracking-tighter tnum text-ink-900">
              {row.value}
              <span className="font-mono text-xs font-normal text-ink-400">
                /100
              </span>
            </span>
          </div>
          <ProgressBar
            value={row.value}
            tone={
              row.tone ??
              (row.value >= 75 ? "moss" : row.value >= 50 ? "warning" : "danger")
            }
          />
        </div>
      ))}
    </div>
  );
}
