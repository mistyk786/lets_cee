import { Quote } from "lucide-react";
import type { OptimisationOpportunity } from "@/lib/types";

export function DetectionEvidence({
  opportunity,
}: {
  opportunity: OptimisationOpportunity;
}) {
  const { evidence } = opportunity;
  const facts = [
    {
      value: `${evidence.repeatedRuns}`,
      label:
        opportunity.frequency.unit === "week"
          ? "similar threads in the last 7 days"
          : "repeated runs detected",
    },
    {
      value: `${evidence.averageEmailsPerRun}`,
      label: "avg email exchanges per request",
    },
    {
      value:
        evidence.averageCycleTimeHours >= 24
          ? `${(evidence.averageCycleTimeHours / 24).toFixed(1)} days`
          : `${evidence.averageCycleTimeHours} hrs`,
      label: "average completion time",
    },
    {
      value: `${Math.round(evidence.patternConfidence * 100)}%`,
      label: "pattern confidence",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {facts.map((f) => (
          <div
            key={f.label}
            className="rounded-xl border border-ink-100 bg-ink-50/50 p-3 text-center"
          >
            <p className="text-xl font-bold text-ink-900">{f.value}</p>
            <p className="mt-0.5 text-xs leading-tight text-ink-500">
              {f.label}
            </p>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
          Example signals SLOTH observed
        </p>
        <ul className="space-y-2">
          {evidence.examples.slice(0, 4).map((ex, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-lg bg-white px-3 py-2 text-sm text-ink-600 ring-1 ring-ink-100"
            >
              <Quote size={14} className="mt-0.5 shrink-0 text-ink-300" />
              <span className="italic">{ex}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
