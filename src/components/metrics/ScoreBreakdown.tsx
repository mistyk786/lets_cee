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
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-ink-600">{row.label}</span>
              {row.hint && <Tooltip content={row.hint} />}
            </div>
            <span className="text-sm font-semibold text-ink-900">
              {row.value}
              <span className="text-ink-400">/100</span>
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
