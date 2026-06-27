import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Repeat,
  Timer,
  CalendarClock,
  Mails,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import type { OverviewSummary } from "@/lib/types";
import { StepProgress } from "@/components/layout/StepProgress";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ScoreRing } from "@/components/ui/Progress";
import { Tooltip } from "@/components/ui/Tooltip";
import { MetricCard } from "@/components/metrics/MetricCard";
import { AssistantInsightCard } from "@/components/assistant/AssistantInsightCard";
import { Skeleton } from "@/components/ui/LoadingState";

export function OverviewPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<OverviewSummary | null>(null);

  useEffect(() => {
    api.getOverview().then(setSummary);
  }, []);

  const flagshipId = "internal-meeting-scheduling";

  function handleAssistantAction(action: string) {
    if (action.toLowerCase().includes("review"))
      navigate(`/opportunities/${flagshipId}`);
    else navigate(`/opportunities/${flagshipId}`);
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-ink-400">Workflow analysis</p>
          <h1 className="text-2xl font-bold text-ink-900">
            {summary?.workflowName ?? "Internal Meeting Scheduling"}
          </h1>
        </div>
        <StepProgress current="detect" />
      </div>

      {!summary ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          {/* Opportunity hero */}
          <div className="card overflow-hidden">
            <div className="grid gap-6 p-6 lg:grid-cols-[auto,1fr]">
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-moss-50/60 px-8 py-6">
                <ScoreRing score={summary.opportunityScore} label="score" />
                <div className="flex items-center gap-1.5 text-center">
                  <span className="text-xs font-medium text-ink-500">
                    Automation Opportunity Score
                  </span>
                  <Tooltip content="A blended measure of repetition, consistency, data quality and risk. Higher means a stronger, safer automation candidate." />
                </div>
              </div>

              <div className="flex flex-col justify-center">
                <Badge tone="accent" dot>
                  {summary.status}
                </Badge>
                <p className="mt-3 text-lg font-medium leading-relaxed text-ink-800">
                  {summary.explanation}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button onClick={() => navigate(`/opportunities/${flagshipId}`)}>
                    Review optimisation
                    <ArrowRight size={16} />
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => navigate("/opportunities")}
                  >
                    View all opportunities
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Key metrics */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">
              This workflow, by the numbers
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard
                label="Workflow runs"
                value={summary.metrics.runsPerMonth}
                unit="/month"
                icon={Repeat}
                hint="How many times this workflow ran in the last 30 days."
              />
              <MetricCard
                label="Manual time per run"
                value={summary.metrics.manualMinutesPerRun}
                unit="min"
                icon={Timer}
                hint="Average hands-on minutes you spend each time this workflow runs."
              />
              <MetricCard
                label="Avg completion time"
                value={summary.metrics.averageCompletionDays}
                unit="days"
                icon={CalendarClock}
                hint="Time from the first scheduling email to a confirmed event."
              />
              <MetricCard
                label="Emails per meeting"
                value={summary.metrics.emailsPerMeeting}
                icon={Mails}
                hint="Average back-and-forth emails needed to agree a time."
              />
              <MetricCard
                label="Monthly coordination"
                value={summary.metrics.monthlyCoordinationHours}
                unit="hrs"
                icon={Clock}
                hint="Estimated total time spent coordinating this workflow each month."
              />
              <div className="flex flex-col justify-center rounded-2xl border border-moss-200/70 bg-gradient-to-br from-moss-50 to-white p-5">
                <div className="flex items-center gap-2 text-moss-700">
                  <Sparkles size={16} />
                  <p className="text-sm font-semibold">Why this matters</p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  This pattern repeats predictably with low risk — a strong
                  candidate for a safe, human-approved automation.
                </p>
              </div>
            </div>
          </div>

          {/* Contextual assistant */}
          <AssistantInsightCard
            context="overview"
            onAction={handleAssistantAction}
          />
        </>
      )}
    </div>
  );
}
