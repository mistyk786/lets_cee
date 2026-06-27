import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  BarChart3,
  Clock,
  Layers,
  CheckCircle2,
  ThumbsUp,
  Timer,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";
import type { EffectivenessMetrics } from "@/lib/types";
import { StepProgress } from "@/components/layout/StepProgress";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ScoreRing } from "@/components/ui/Progress";
import { LoadingState } from "@/components/ui/LoadingState";
import { MetricCard } from "@/components/metrics/MetricCard";
import { ScoreBreakdown } from "@/components/metrics/ScoreBreakdown";
import { SafetyStatusCard } from "@/components/metrics/SafetyStatusCard";
import { scoreBand } from "@/lib/utils";

const BAND_TONE = {
  success: "success",
  info: "info",
  warning: "warning",
  danger: "danger",
} as const;

export function EffectivenessPage() {
  const { id } = useParams();
  const [metrics, setMetrics] = useState<EffectivenessMetrics | null>(null);

  useEffect(() => {
    api.getEffectiveness(id).then(setMetrics);
  }, [id]);

  if (!metrics) return <LoadingState label="Loading effectiveness…" />;

  const band = scoreBand(metrics.overallScore);
  const needsReview = metrics.safetyStatus === "needs_review";
  // Safety rule: never recommend expansion if the automation needs review.
  const canRecommendExpansion = !needsReview && metrics.overallScore >= 75;
  const d = metrics.details;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 size={22} className="text-moss-600" />
            <h1 className="text-2xl font-bold text-ink-900">Measure Impact</h1>
          </div>
          <p className="mt-1 text-ink-500">
            Internal Meeting Scheduling Assistant · effectiveness after
            activation
          </p>
        </div>
        <StepProgress current="measure" />
      </div>

      {/* Overall score hero */}
      <Card>
        <CardBody>
          <div className="grid items-center gap-6 lg:grid-cols-[auto,1fr]">
            <div className="flex flex-col items-center gap-2">
              <ScoreRing score={metrics.overallScore} size={140} stroke={12} />
              <Badge
                tone={needsReview ? "warning" : BAND_TONE[band.tone]}
                dot
              >
                {needsReview ? "Needs review" : band.label}
              </Badge>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Automation Effectiveness Score
              </p>
              <p className="mt-2 text-lg font-medium leading-relaxed text-ink-800">
                {needsReview
                  ? "A safety issue was detected. Approval mode stays on and expansion is paused until you review what happened."
                  : "The automation is saving close to its forecasted time, has low correction rates, and is reducing scheduling delays."}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Highlight
                  label="Time realised"
                  value={`${Math.round((d.realisedMinutes / d.forecastMinutes) * 100)}%`}
                />
                <Highlight
                  label="Successful runs"
                  value={`${d.successfulRuns}/${d.totalRuns}`}
                />
                <Highlight
                  label="User acceptance"
                  value={`${d.acceptancePercentage}%`}
                />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Metric cards */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">
          Performance metrics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label="Realised time saved"
            value={d.realisedMinutes}
            unit={`/ ${d.forecastMinutes} min`}
            icon={Clock}
            sub="forecasted"
            hint="Actual minutes saved versus the forecast."
          />
          <MetricCard
            label="Automation coverage"
            value={d.coverageRuns}
            unit={`/ ${d.coverageEligible}`}
            icon={Layers}
            sub="eligible workflows"
            hint="How many eligible runs the automation actually handled."
          />
          <MetricCard
            label="Reliability"
            value={d.successfulRuns}
            unit={`/ ${d.totalRuns}`}
            icon={CheckCircle2}
            sub="successful runs"
            hint="Runs completed without error."
          />
          <MetricCard
            label="Quality"
            value={d.correctionsNeeded}
            unit={`/ ${d.totalRuns}`}
            icon={ThumbsUp}
            sub="needed correction"
            hint="Outputs that required a manual fix."
          />
          <MetricCard
            label="Cycle time"
            value={`${d.cycleTimeBeforeDays} → ${d.cycleTimeAfterDays}`}
            unit="days"
            icon={Timer}
            hint="Average scheduling time before and after automation."
          />
          <MetricCard
            label="User acceptance"
            value={d.acceptancePercentage}
            unit="%"
            icon={ThumbsUp}
            hint="Share of SLOTH drafts you approved without edits."
          />
        </div>
      </div>

      {/* Score breakdown + safety */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
        <Card>
          <CardHeader
            title="Score breakdown"
            description="What's driving the overall effectiveness score."
            icon={<BarChart3 size={18} />}
          />
          <CardBody>
            <ScoreBreakdown
              rows={[
                {
                  label: "Time realisation",
                  value: metrics.realisedTimeScore,
                  hint: "Saved time as a share of forecast.",
                },
                {
                  label: "Coverage",
                  value: metrics.coverageScore,
                  hint: "Eligible runs handled.",
                },
                {
                  label: "Reliability",
                  value: metrics.reliabilityScore,
                  hint: "Successful runs.",
                },
                {
                  label: "Quality",
                  value: metrics.qualityScore,
                  hint: "Low correction rate.",
                },
                {
                  label: "Cycle-time improvement",
                  value: metrics.cycleTimeScore,
                  hint: "Faster scheduling.",
                },
                {
                  label: "User acceptance",
                  value: metrics.acceptanceScore,
                  hint: "Drafts approved without edits.",
                },
              ]}
            />
          </CardBody>
        </Card>

        <div className="space-y-4">
          <SafetyStatusCard
            status={metrics.safetyStatus}
            incidents={metrics.safetyIncidents}
          />

          {/* Recommendation — suppressed when expansion isn't safe. */}
          <div className="rounded-2xl border border-ink-100 bg-white p-5">
            <div className="flex items-center gap-2 text-moss-700">
              <Sparkles size={16} />
              <p className="text-sm font-semibold">SLOTH recommends</p>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              {canRecommendExpansion
                ? "Expand to trusted internal contacts first. Keep external meetings in approval mode."
                : "Keep this automation in approval mode and review the recent issue before making any changes. I won't recommend expanding until it's resolved."}
            </p>
          </div>

          {/* Score interpretation guide */}
          <div className="rounded-2xl border border-ink-100 bg-ink-50/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              How to read this score
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-ink-600">
              <Interpretation range="90–100" text="Excellent — expand carefully" />
              <Interpretation
                range="75–89"
                text="Performing well — maintain and monitor"
              />
              <Interpretation
                range="50–74"
                text="Needs refinement — review exceptions and rules"
              />
              <Interpretation
                range="Below 50"
                text="Needs review — pause or redesign"
              />
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Highlight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-moss-50 px-3 py-2">
      <p className="inline-flex items-center gap-1 text-xs text-moss-700">
        <TrendingUp size={12} />
        {label}
      </p>
      <p className="mt-0.5 text-lg font-bold text-ink-900">{value}</p>
    </div>
  );
}

function Interpretation({ range, text }: { range: string; text: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="w-16 shrink-0 font-semibold text-ink-700">{range}</span>
      <span>{text}</span>
    </li>
  );
}
