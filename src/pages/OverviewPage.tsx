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
import { useApp } from "@/context/AppContext";
import type { OverviewSummary } from "@/lib/types";
import { WatcherStatusPanel } from "@/components/layout/WatcherStatusPanel";
import { StepProgress } from "@/components/layout/StepProgress";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ScoreRing } from "@/components/ui/Progress";
import { Tooltip } from "@/components/ui/Tooltip";
import { MetricCard } from "@/components/metrics/MetricCard";
import { AssistantInsightCard } from "@/components/assistant/AssistantInsightCard";
import { Skeleton } from "@/components/ui/LoadingState";

export function OverviewPage() {
  const navigate = useNavigate();
  const { watcherStatus } = useApp();
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
          <SectionLabel index="01">Workflow analysis</SectionLabel>
          <h1 className="mt-2.5 font-display text-[2rem] font-medium leading-tight tracking-tighter text-ink-900">
            {summary?.workflowName ?? "Internal Meeting Scheduling"}
          </h1>
        </div>
        <StepProgress current="detect" />
      </div>

      <WatcherStatusPanel status={watcherStatus} />

      {!summary ? (
        <Skeleton className="h-64 w-full" />
      ) : summary.automationAvailable === false ? (
        <div className="card p-8 text-center">
          <Badge tone="warning">No automation available</Badge>
          <h2 className="mt-4 font-display text-2xl font-medium text-ink-900">
            {summary.workflowName}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-ink-600">{summary.explanation}</p>
          <p className="mt-4 text-sm text-ink-500">
            Sloth read your real inbox. Nothing met the bar for safe automation
            (repeatable pattern, score ≥ 45, clear actions). Check the bell for
            details or send yourself a test scheduling email and scan again.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="secondary" onClick={() => navigate("/setup")}>
              Scan again
            </Button>
          </div>
        </div>
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
                {summary.automatableActions &&
                  summary.automatableActions.length > 0 && (
                    <ul className="mt-4 space-y-1 text-sm text-ink-600">
                      {summary.automatableActions.map((action) => (
                        <li key={action}>• {action}</li>
                      ))}
                    </ul>
                  )}
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
