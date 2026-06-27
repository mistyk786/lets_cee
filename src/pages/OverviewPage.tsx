import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Repeat,
  Timer,
  ArrowRight,
  Bell,
} from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import type { OverviewSummary } from "@/lib/types";
import { WatcherStatusPanel } from "@/components/layout/WatcherStatusPanel";
import { RecentInboxPanel } from "@/components/inbox/RecentInboxPanel";
import { DetectedPatternsPanel } from "@/components/inbox/DetectedPatternsPanel";
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
  const { watcherStatus, notifications } = useApp();
  const [summary, setSummary] = useState<OverviewSummary | null>(null);
  const live = api.isLive();

  useEffect(() => {
    api.getOverview().then(setSummary);
  }, []);

  const showMetrics =
    summary &&
    summary.automationAvailable !== false &&
    summary.metrics.runsPerMonth > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <SectionLabel index="01">Inbox analysis</SectionLabel>
          <h1 className="mt-2.5 font-display text-[2rem] font-medium leading-tight tracking-tighter text-ink-900">
            {summary?.workflowName ??
              watcherStatus?.workflowName ??
              (live ? "Awaiting scan" : "Demo workflow")}
          </h1>
        </div>
        {summary?.automationAvailable !== false && (
          <StepProgress current="detect" />
        )}
      </div>

      <WatcherStatusPanel status={watcherStatus} />

      {live && <RecentInboxPanel limit={6} compact />}

      {summary?.detectedPatterns && summary.detectedPatterns.length > 0 && (
        <DetectedPatternsPanel patterns={summary.detectedPatterns} />
      )}

      {!summary ? (
        <Skeleton className="h-64 w-full" />
      ) : summary.automationAvailable === false ? (
        <div className="card p-8 text-center">
          <Badge tone="warning">No automation available</Badge>
          <h2 className="mt-4 font-display text-2xl font-medium text-ink-900">
            {summary.workflowName}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-ink-600">{summary.explanation}</p>
          {summary.detectedPatterns && summary.detectedPatterns.length > 0 && (
            <div className="mx-auto mt-6 max-w-lg text-left">
              <DetectedPatternsPanel patterns={summary.detectedPatterns} />
            </div>
          )}
          <p className="mt-4 text-sm text-ink-500">
            {live
              ? "This is from your real Gmail — not demo data. Sloth only recommends automation when the pattern repeats and the score is high enough."
              : "Run with a live backend to analyse your inbox."}
          </p>
          {notifications.length > 0 && (
            <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-moss-700">
              <Bell size={16} />
              {notifications.length} notification
              {notifications.length === 1 ? "" : "s"} in the bell — open for details.
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="secondary" onClick={() => navigate("/setup")}>
              Scan again
            </Button>
            <Button onClick={() => navigate("/opportunities")}>
              View inbox findings
            </Button>
          </div>
          <AssistantInsightCard context="overview" className="mt-8 text-left" />
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="grid gap-6 p-6 lg:grid-cols-[auto,1fr]">
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-moss-50/60 px-8 py-6">
                <ScoreRing score={summary.opportunityScore} label="score" />
                <div className="flex items-center gap-1.5 text-center">
                  <span className="text-xs font-medium text-ink-500">
                    Automation score
                  </span>
                  <Tooltip content="Based on repetition, consistency, and safety from your inbox analysis." />
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
                  {notifications.some((n) => n.action === "automate") && (
                    <Button
                      onClick={() => {
                        const n = notifications.find((x) => x.action === "automate");
                        if (n) navigate(`/automate/${n.id}`);
                      }}
                    >
                      Automate from notification
                      <ArrowRight size={16} />
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => navigate("/opportunities")}
                  >
                    View details
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {showMetrics && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">
                From your inbox analysis
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <MetricCard
                  label="Similar instances"
                  value={summary.metrics.runsPerMonth}
                  unit=" detected"
                  icon={Repeat}
                  hint="How many similar patterns Sloth found in recent email."
                />
                <MetricCard
                  label="Manual time per run"
                  value={summary.metrics.manualMinutesPerRun}
                  unit="min"
                  icon={Timer}
                  hint="Estimated hands-on time per workflow run from AI step analysis."
                />
                {summary.metrics.monthlyCoordinationHours > 0 && (
                  <MetricCard
                    label="Est. monthly time"
                    value={summary.metrics.monthlyCoordinationHours}
                    unit="hrs"
                    icon={Timer}
                    hint="Rough monthly coordination time if this pattern continues."
                  />
                )}
              </div>
            </div>
          )}

          <AssistantInsightCard context="overview" />
        </>
      )}
    </div>
  );
}
