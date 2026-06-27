import { useNavigate } from "react-router-dom";
import {
  Mail,
  CalendarDays,
  ArrowRight,
  GitBranch,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import type { OptimisationOpportunity } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  APPROVAL_MODE_LABELS,
  formatRelativeDate,
  riskMeta,
  statusMeta,
} from "@/lib/utils";

export function OpportunityCard({
  opportunity,
}: {
  opportunity: OptimisationOpportunity;
}) {
  const navigate = useNavigate();
  const status = statusMeta(opportunity.status);
  const risk = riskMeta(opportunity.riskLevel);
  const topBottleneck = opportunity.bottlenecks[0];

  return (
    <div className="card card-interactive group flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-ink-900">
              {opportunity.workflowName}
            </h3>
            <Badge tone={status.tone} dot={opportunity.status === "detected"}>
              {status.label}
            </Badge>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
            {opportunity.description}
          </p>
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

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Highlight
          icon={GitBranch}
          label="Steps today"
          value={`${opportunity.currentWorkflow.length} manual steps`}
        />
        <Highlight
          icon={ShieldCheck}
          label="Suggested mode"
          value={APPROVAL_MODE_LABELS[opportunity.recommendedMode]}
        />
        <Highlight
          icon={AlertCircle}
          label="Main friction"
          value={
            topBottleneck
              ? topBottleneck.title
              : `${opportunity.bottlenecks.length} bottlenecks`
          }
        />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4">
        <Badge tone={risk.tone}>{risk.label} risk</Badge>
        <Button
          size="sm"
          onClick={() => navigate(`/opportunities/${opportunity.id}`)}
        >
          Choose how to automate
          <ArrowRight size={15} />
        </Button>
      </div>
    </div>
  );
}

function Highlight({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof GitBranch;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-ink-50/70 px-3 py-2.5">
      <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-label text-ink-400">
        <Icon size={12} />
        {label}
      </div>
      <p className="mt-1 text-sm font-medium leading-snug text-ink-800">
        {value}
      </p>
    </div>
  );
}
