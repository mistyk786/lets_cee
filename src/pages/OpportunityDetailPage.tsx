import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Coins,
  Gauge,
  GitBranch,
  Sparkles,
  SlidersHorizontal,
  LineChart,
  Zap,
  ShieldCheck,
  CheckCircle2,
  CalendarPlus,
  MailCheck,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import type {
  ActivationPreview,
  AutomationRule,
  Forecast,
  OptimisationOpportunity,
} from "@/lib/types";
import { StepProgress, type ProcessStep } from "@/components/layout/StepProgress";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ScoreRing } from "@/components/ui/Progress";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/metrics/MetricCard";
import { ScoreBreakdown } from "@/components/metrics/ScoreBreakdown";
import { ForecastPanel } from "@/components/metrics/ForecastPanel";
import { DetectionEvidence } from "@/components/opportunities/DetectionEvidence";
import {
  WorkflowDiagram,
  WorkflowLegend,
} from "@/components/workflows/WorkflowDiagram";
import { BottleneckCard } from "@/components/workflows/BottleneckCard";
import { AutomationRulesPanel } from "@/components/automations/AutomationRulesPanel";
import { AutomationRuleSummary } from "@/components/automations/AutomationRuleSummary";
import { ActivationModal } from "@/components/automations/ActivationModal";
import {
  APPROVAL_MODE_LABELS,
  riskMeta,
  statusMeta,
} from "@/lib/utils";

const SECTIONS = [
  { id: "evidence", label: "Why detected", icon: Search },
  { id: "cost", label: "Current cost", icon: Coins },
  { id: "readiness", label: "Readiness", icon: Gauge },
  { id: "current", label: "Current workflow", icon: GitBranch },
  { id: "proposed", label: "Proposed automation", icon: Sparkles },
  { id: "rules", label: "Edit rules", icon: SlidersHorizontal },
  { id: "forecast", label: "Forecast", icon: LineChart },
];

export function OpportunityDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { draftRules, setDraftRules, addActiveAutomation } = useApp();

  const [opp, setOpp] = useState<OptimisationOpportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<AutomationRule | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
  const [activationPreview, setActivationPreview] =
    useState<ActivationPreview | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.getOpportunity(id).then((data) => {
      if (!active) return;
      setOpp(data);
      if (data) {
        const initial = draftRules[id] ?? data.proposedRules;
        setRules(initial);
        setForecast(data.forecast);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Recompute the forecast whenever rules change (mock API call).
  useEffect(() => {
    if (!opp || !rules) return;
    setDraftRules(id, rules);
    const handle = setTimeout(() => {
      api.forecast(id, rules).then(setForecast);
    }, 150);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules]);

  const automationName = useMemo(
    () => (opp ? `${capitalise(opp.workflowName)} Assistant` : "Automation"),
    [opp]
  );

  async function handleActivate() {
    if (!opp || !rules) return;
    setActivating(true);
    const { automation, preview } = await api.activateAutomation(opp.id, rules);
    const active = {
      ...automation,
      name: automationName,
      runsCompleted: 0,
    };
    addActiveAutomation(active);
    setActivationPreview(preview ?? null);
    setActivating(false);
    setModalOpen(false);
    setActivated(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function scrollTo(sectionId: string) {
    document
      .getElementById(sectionId)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (loading) return <LoadingState label="Loading opportunity…" />;
  if (!opp || !rules || !forecast)
    return (
      <EmptyState
        title="Opportunity not found"
        description="This opportunity may have been removed."
        action={
          <Button onClick={() => navigate("/opportunities")}>
            Back to Opportunities
          </Button>
        }
      />
    );

  const status = statusMeta(opp.status);
  const risk = riskMeta(opp.riskLevel);
  const totalManualTime =
    opp.frequency.unit === "month"
      ? `${Math.round((opp.frequency.value * opp.evidence.manualMinutesPerRun) / 6) / 10} hrs/month`
      : `${opp.frequency.value * opp.evidence.manualMinutesPerRun} min/${opp.frequency.unit}`;
  const currentStep: ProcessStep = activated ? "measure" : "design";

  const hasDiagram = opp.currentWorkflow.length > 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb + header */}
      <div>
        <button
          onClick={() => navigate("/opportunities")}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800 focus-ring rounded"
        >
          <ArrowLeft size={15} /> Opportunities
        </button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-[2rem] font-medium capitalize leading-tight tracking-tighter text-ink-900">
                {opp.workflowName}
              </h1>
              <Badge tone={status.tone} dot={opp.status === "detected"}>
                {status.label}
              </Badge>
              <Badge tone={risk.tone}>{risk.label} risk</Badge>
            </div>
            <p className="mt-1 max-w-2xl text-ink-500">{opp.description}</p>
          </div>
          <StepProgress current={currentStep} />
        </div>
      </div>

      {/* Activation success state */}
      {activated && (
        <ActivationSuccess
          name={automationName}
          preview={activationPreview}
          approvalMode={rules.approvalMode}
          onViewPerformance={() => navigate(`/effectiveness/${opp.id}`)}
        />
      )}

      {/* Section navigation */}
      <div className="sticky top-14 z-20 -mx-4 border-y border-ink-100 bg-ink-50/90 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <div className="flex gap-1 overflow-x-auto">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-ink-600 transition-colors hover:bg-white hover:text-ink-900"
            >
              <s.icon size={14} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section A: Why SLOTH detected this */}
      <section id="evidence" className="scroll-mt-28">
        <Card>
          <CardHeader
            title="Why SLOTH detected this"
            description="The evidence behind this opportunity."
            icon={<Search size={18} />}
          />
          <CardBody className="space-y-4">
            <DetectionEvidence opportunity={opp} />
            <div className="flex items-start gap-3 rounded-xl bg-moss-50 p-4">
              <Sparkles size={16} className="mt-0.5 shrink-0 text-moss-600" />
              <p className="text-sm leading-relaxed text-ink-700">
                “I found the same sequence repeated across{" "}
                {opp.evidence.repeatedRuns} conversations: a scheduling change,
                a manual calendar check, several replies, and an updated event.”
              </p>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Section B: Current cost */}
      <section id="cost" className="scroll-mt-28">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-400">
          <Coins size={15} /> Current cost of the workflow
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label="Frequency"
            value={opp.frequency.value}
            unit={`/${opp.frequency.unit}`}
            trend={opp.frequency.trendPercentage}
          />
          <MetricCard
            label="Manual minutes per run"
            value={opp.evidence.manualMinutesPerRun}
            unit="min"
          />
          <MetricCard
            label="Est. total time"
            value={totalManualTime.split(" ")[0]}
            unit={totalManualTime.split(" ")[1]}
            hint="Frequency multiplied by manual minutes per run."
          />
          <MetricCard
            label="Avg emails per run"
            value={opp.evidence.averageEmailsPerRun}
          />
          <MetricCard
            label="Avg cycle time"
            value={
              opp.evidence.averageCycleTimeHours >= 24
                ? (opp.evidence.averageCycleTimeHours / 24).toFixed(1)
                : opp.evidence.averageCycleTimeHours
            }
            unit={opp.evidence.averageCycleTimeHours >= 24 ? "days" : "hrs"}
          />
          <MetricCard
            label="Manual touchpoints"
            value={opp.currentWorkflow.filter((s) => s.actor === "user").length || 5}
            hint="Distinct hands-on steps you perform each run."
          />
        </div>
      </section>

      {/* Section C: Automation readiness */}
      <section id="readiness" className="scroll-mt-28">
        <Card>
          <CardHeader
            title="Automation readiness"
            description="How strong and safe an automation candidate this is."
            icon={<Gauge size={18} />}
          />
          <CardBody>
            <div className="grid gap-6 lg:grid-cols-[auto,1fr]">
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-ink-50/70 px-8 py-6">
                <ScoreRing score={opp.scores.opportunityScore} label="score" />
                <p className="text-center text-xs font-medium text-ink-500">
                  Opportunity score
                </p>
                <div className="flex flex-col items-center gap-1.5 text-sm">
                  <span className="text-ink-500">
                    Confidence{" "}
                    <strong className="text-ink-800">
                      {opp.scores.confidenceScore}%
                    </strong>
                  </span>
                  <Badge tone={risk.tone}>Risk: {risk.label}</Badge>
                </div>
              </div>
              <div className="space-y-5">
                <ScoreBreakdown
                  rows={[
                    {
                      label: "Repetition",
                      value: opp.scores.repetitionScore,
                      hint: "How consistently this pattern repeats.",
                    },
                    {
                      label: "Consistency",
                      value: opp.scores.consistencyScore,
                      hint: "How similar each run is to the others.",
                    },
                    {
                      label: "Data completeness",
                      value: opp.scores.dataCompletenessScore,
                      hint: "How much signal SLOTH has to work from.",
                    },
                    {
                      label: "Safety (inverse risk)",
                      value: 100 - opp.scores.riskScore,
                      hint: "Higher means lower risk of unsafe actions.",
                      tone: "moss",
                    },
                  ]}
                />
                <div className="flex items-center gap-3 rounded-xl border border-moss-200 bg-moss-50 p-3.5">
                  <ShieldCheck size={18} className="shrink-0 text-moss-600" />
                  <p className="text-sm text-ink-700">
                    Recommended mode:{" "}
                    <strong>{APPROVAL_MODE_LABELS[opp.recommendedMode]}</strong>
                  </p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Section D: Current workflow diagram */}
      <section id="current" className="scroll-mt-28">
        <Card>
          <CardHeader
            title="Current manual workflow"
            description="Each step today, with the friction points highlighted."
            icon={<GitBranch size={18} />}
          />
          <CardBody>
            {hasDiagram ? (
              <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
                <WorkflowDiagram steps={opp.currentWorkflow} variant="current" />
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
                      Friction points
                    </p>
                    <div className="space-y-2">
                      {opp.bottlenecks.map((b) => (
                        <BottleneckCard key={b.id} bottleneck={b} />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-calendar/30 bg-calendar/5 p-4">
                    <p className="text-sm leading-relaxed text-ink-700">
                      This workflow occurred{" "}
                      <strong>{opp.evidence.repeatedRuns} times</strong> this{" "}
                      {opp.frequency.unit === "week" ? "week" : "month"} and
                      required around{" "}
                      <strong>{totalManualTime}</strong> of manual coordination.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Workflow mapping in progress"
                description="SLOTH is still gathering enough signal to map this workflow into steps."
              />
            )}
          </CardBody>
        </Card>
      </section>

      {/* Screen 6: Proposed automation */}
      <section id="proposed" className="scroll-mt-28">
        <Card>
          <CardHeader
            title="Proposed automation"
            description="The future-state dataflow. Notice where you stay in control."
            icon={<Sparkles size={18} />}
            action={
              opp.proposedWorkflow.length > 0 ? (
                <div className="hidden sm:block">
                  <WorkflowLegend
                    kinds={opp.proposedWorkflow.map((s) => s.kind ?? "manual")}
                  />
                </div>
              ) : undefined
            }
          />
          <CardBody>
            {opp.proposedWorkflow.length > 0 ? (
              <>
                <div className="mb-4 sm:hidden">
                  <WorkflowLegend
                    kinds={opp.proposedWorkflow.map((s) => s.kind ?? "manual")}
                  />
                </div>
                <div className="mx-auto max-w-md">
                  <WorkflowDiagram
                    steps={opp.proposedWorkflow}
                    variant="proposed"
                  />
                </div>
              </>
            ) : (
              <EmptyState title="Proposed automation coming soon" />
            )}
          </CardBody>
        </Card>
      </section>

      {/* Screen 7: Editable rules */}
      <section id="rules" className="scroll-mt-28">
        <div className="grid gap-6 lg:grid-cols-[1.3fr,1fr]">
          <Card>
            <CardHeader
              title="Automation rules"
              description="Tune the safety rules. The generated rule updates live."
              icon={<SlidersHorizontal size={18} />}
            />
            <CardBody>
              <AutomationRulesPanel rule={rules} onChange={setRules} />
            </CardBody>
          </Card>
          <div className="space-y-4 lg:sticky lg:top-32 lg:self-start">
            <AutomationRuleSummary rule={rules} />
            <div className="flex items-start gap-3 rounded-2xl border border-moss-200/70 bg-moss-50 p-4">
              <Sparkles size={16} className="mt-0.5 shrink-0 text-moss-600" />
              <p className="text-sm leading-relaxed text-ink-700">
                “I recommend starting in approval mode. Once the workflow
                performs reliably, you can expand automation for trusted internal
                contacts.”
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Screen 8: Forecast */}
      <section id="forecast" className="scroll-mt-28">
        <Card>
          <CardHeader
            title="Expected impact"
            description="Forecast time saved under your current rules."
            icon={<LineChart size={18} />}
          />
          <CardBody>
            <ForecastPanel forecast={forecast} />
          </CardBody>
        </Card>
      </section>

      {/* Activation CTA */}
      {!activated && (
        <div className="sticky bottom-4 z-20">
          <div className="card flex flex-col items-center justify-between gap-3 border-moss-200 p-4 shadow-lift sm:flex-row">
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} className="text-moss-600" />
              <p className="text-sm text-ink-600">
                Activate in approval mode —{" "}
                <strong className="text-ink-900">
                  likely {forecast.likelyHours} hrs/month saved
                </strong>
                . Nothing sends without you.
              </p>
            </div>
            <Button onClick={() => setModalOpen(true)} size="lg">
              <Zap size={18} />
              Activate Automation
            </Button>
          </div>
        </div>
      )}

      <ActivationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onActivate={handleActivate}
        onSaveForLater={() => setModalOpen(false)}
        rule={rules}
        forecast={forecast}
        name={automationName}
        activating={activating}
      />
    </div>
  );
}

function ActivationSuccess({
  name,
  preview,
  approvalMode,
  onViewPerformance,
}: {
  name: string;
  preview: ActivationPreview | null;
  approvalMode: AutomationRule["approvalMode"];
  onViewPerformance: () => void;
}) {
  const slotCount = preview?.slotCount ?? preview?.proposedSlots?.length ?? 3;
  const triggerLabel =
    preview?.triggerLabel ?? "New scheduling email detected";
  const slotsLabel = `${slotCount} suitable slot${slotCount === 1 ? "" : "s"} prepared`;
  const approvalLabel =
    approvalMode === "draft"
      ? "Draft reply saved for review"
      : approvalMode === "trusted_internal_auto_send"
        ? "Reply queued for trusted internal send"
        : "Draft reply ready for your approval";
  const isLivePreview = Boolean(preview?.draftReply || preview?.proposedSlots?.length);

  return (
    <div className="overflow-hidden rounded-2xl border border-moss-200 bg-gradient-to-br from-moss-50 to-white shadow-soft animate-fade-in">
      <div className="flex items-center gap-3 border-b border-moss-100 px-5 py-4">
        <CheckCircle2 size={22} className="text-moss-600" />
        <div>
          <p className="font-semibold text-ink-900">
            Automation activated in {APPROVAL_MODE_LABELS[approvalMode]} mode.
          </p>
          <p className="text-sm text-ink-500">{name} is now watching for matching work.</p>
        </div>
      </div>
      <div className="p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
          {isLivePreview ? "Next action preview" : "Simulated next action"}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <SimStep icon={MailCheck} title={triggerLabel} tone="#3d8c62" />
          <SimStep icon={CalendarPlus} title={slotsLabel} tone="#2f7fae" />
          <SimStep icon={ShieldCheck} title={approvalLabel} tone="#b9863f" />
        </div>
        {preview?.draftReply && (
          <div className="mt-4 rounded-xl border border-ink-100 bg-white p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
              Draft reply
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
              {preview.draftReply}
            </p>
          </div>
        )}
        {preview?.tentativeEventTitle && (
          <p className="mt-3 text-sm text-ink-600">
            Tentative calendar hold:{" "}
            <span className="font-medium text-ink-800">
              {preview.tentativeEventTitle}
            </span>
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={onViewPerformance}>
            View performance
            <ArrowRight size={16} />
          </Button>
        </div>
        {!isLivePreview && (
          <p className="mt-3 text-xs text-ink-400">
            This is a simulated preview. No email is sent and no calendar event is
            created.
          </p>
        )}
      </div>
    </div>
  );
}

function SimStep({
  icon: Icon,
  title,
  tone,
}: {
  icon: typeof MailCheck;
  title: string;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
        style={{ backgroundColor: tone }}
      >
        <Icon size={16} />
      </div>
      <p className="text-sm font-medium text-ink-800">{title}</p>
    </div>
  );
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
