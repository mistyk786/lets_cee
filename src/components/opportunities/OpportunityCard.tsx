import { useNavigate } from "react-router-dom";
import {
  Mail,
  CalendarDays,
  ArrowRight,
  Repeat,
  Timer,
  Gauge,
  ShieldCheck,
} from "lucide-react";
import type { OptimisationOpportunity } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  formatRelativeDate,
  frequencyLabel,
  riskMeta,
  statusMeta,
} from "@/lib/utils";

function effortLabel(opp: OptimisationOpportunity): string {
  const { value, unit } = opp.frequency;
  const totalMinutes = value * opp.evidence.manualMinutesPerRun;
  if (unit === "month") {
    const hrs = Math.round((totalMinutes / 60) * 10) / 10;
    return `${hrs} hrs/month`;
  }
  if (unit === "week") return `${totalMinutes} min/week`;
  return `${totalMinutes} min/day`;
}

export function OpportunityCard({
  opportunity,
}: {
  opportunity: OptimisationOpportunity;
}) {
  const navigate = useNavigate();
  const status = statusMeta(opportunity.status);
  const risk = riskMeta(opportunity.riskLevel);

  return (
    <div className="card flex flex-col p-5 transition-shadow hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold capitalize text-ink-900">
              {opportunity.workflowName}
            </h3>
            <Badge tone={status.tone} dot={opportunity.status === "detected"}>
              {status.label}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-ink-500">{opportunity.description}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-400">
        <span>Detected {formatRelativeDate(opportunity.detectedAt)}</span>
        <span className="flex items-center gap-1.5">
          {opportunity.sourceSystems.includes("email") && (
            <Mail size={13} className="text-email" />
          )}
          {opportunity.sourceSystems.includes("calendar") && (
            <CalendarDays size={13} className="text-calendar" />
          )}
          {opportunity.sourceSystems
            .map((s) => (s === "email" ? "Email" : "Calendar"))
            .join(" · ")}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          icon={Repeat}
          label="Frequency"
          value={frequencyLabel(opportunity.frequency)}
        />
        <Stat icon={Timer} label="Manual effort" value={effortLabel(opportunity)} />
        <Stat
          icon={Gauge}
          label="Opportunity"
          value={`${opportunity.scores.opportunityScore}/100`}
          hint="Blended repetition, consistency, data quality and risk."
        />
        <Stat
          icon={Gauge}
          label="Confidence"
          value={`${opportunity.scores.confidenceScore}%`}
          hint="How sure SLOTH is that this is a genuine repeated pattern."
        />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4">
        <span className="inline-flex items-center gap-1.5 text-sm">
          <ShieldCheck size={15} className="text-moss-600" />
          <span className="text-ink-500">Risk</span>
          <Badge tone={risk.tone}>{risk.label}</Badge>
        </span>
        <Button
          size="sm"
          onClick={() => navigate(`/opportunities/${opportunity.id}`)}
        >
          Review optimisation
          <ArrowRight size={15} />
        </Button>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Repeat;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl bg-ink-50/70 px-3 py-2">
      <div className="flex items-center gap-1 text-xs text-ink-400">
        <Icon size={12} />
        {label}
        {hint && <Tooltip content={hint} />}
      </div>
      <p className="mt-0.5 text-sm font-semibold text-ink-800">{value}</p>
    </div>
  );
}
