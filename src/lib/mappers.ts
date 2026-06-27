/**
 * Backend (snake_case) → frontend (camelCase) adapters.
 * All UI components consume src/lib/types.ts only.
 */

import type {
  BackendActivationResponse,
  BackendAutomationRule,
  BackendBottleneck,
  BackendDemoDataRaw,
  BackendDetectedWorkflow,
  BackendEffectivenessMetrics,
  BackendForecastMetrics,
  BackendIngestStatus,
  BackendWatcherStatus,
  BackendNotificationItem,
  BackendWorkflowStep,
} from "./backend/types";
import type {
  ActivateAutomationResult,
  ActiveAutomation,
  ApprovalMode,
  AutomationRule,
  DataSource,
  DemoDataset,
  EffectivenessMetrics,
  Forecast,
  NodeKind,
  OptimisationOpportunity,
  OverviewSummary,
  WatcherStatus,
  SlothNotification,
  WorkflowStep,
} from "./types";
import { effectivenessMetrics as mockEffectiveness } from "./mockData";

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

export function mapDemoDataRaw(raw: BackendDemoDataRaw): DemoDataset {
  const emails = raw.emails ?? [];
  const events = raw.calendar_events ?? [];
  const calendarIds = new Set(
    events.map((e) => e.calendar_id ?? e.id ?? "default")
  );

  return {
    workflowName: "Internal Meeting Scheduling",
    dataSources: ["email", "calendar"],
    analysisPeriodDays: raw.analysis_period_days ?? 30,
    summary: {
      schedulingEmailRequests: emails.length || 45,
      calendarSources: calendarIds.size || 3,
      activityHistoryDays: raw.analysis_period_days ?? 30,
    },
  };
}

// ---------------------------------------------------------------------------
// Workflow analysis
// ---------------------------------------------------------------------------

export function mapOverviewSummary(
  workflow: BackendDetectedWorkflow
): OverviewSummary {
  const manualMinutes = averageManualMinutes(workflow.current_steps);
  const runsPerMonth = workflow.occurrence_count;
  const available = workflow.automation_available !== false;

  return {
    workflowName: workflow.workflow_name,
    status: available
      ? "Automation opportunity detected"
      : "No automation available",
    opportunityScore: Math.round(workflow.opportunity_score),
    explanation:
      workflow.automation_summary ||
      workflow.assumptions[0] ||
      (available
        ? "High repetition, predictable steps, and strong automation potential."
        : "Sloth analysed your inbox but did not find a safe workflow to automate."),
    metrics: {
      runsPerMonth,
      manualMinutesPerRun: Math.round(manualMinutes),
      averageCompletionDays: available && runsPerMonth > 0 ? 2.8 : 0,
      emailsPerMeeting: available && runsPerMonth > 0 ? 4.2 : 0,
      monthlyCoordinationHours:
        available && runsPerMonth > 0
          ? Math.round(((runsPerMonth * manualMinutes) / 60) * 10) / 10
          : 0,
    },
    automationAvailable: available,
    automatableActions: workflow.automatable_actions ?? [],
    workflowCategory: workflow.workflow_category ?? "other",
  };
}

export function mapDetectedWorkflowToOpportunity(
  workflow: BackendDetectedWorkflow,
  id = "internal-meeting-scheduling"
): OptimisationOpportunity {
  const manualMinutes = averageManualMinutes(workflow.current_steps);
  const rules = mapAutomationRule(workflow.automation_rules);

  return {
    id,
    workflowName: workflow.workflow_name,
    description:
      workflow.assumptions.join(" ") ||
      "Coordinating meetings from email requests through to a confirmed calendar event.",
    status: workflow.automation_available !== false ? "ready_to_review" : "detected",
    detectedAt: new Date().toISOString(),
    sourceSystems: ["email"],
    frequency: {
      value: workflow.occurrence_count,
      unit: "month",
      trendPercentage: 0,
    },
    evidence: {
      repeatedRuns: workflow.occurrence_count,
      averageEmailsPerRun:
        workflow.occurrence_count > 0
          ? Math.max(1, workflow.current_steps.length)
          : 0,
      averageCycleTimeHours:
        workflow.occurrence_count > 0 ? Math.round(manualMinutes * 2) : 0,
      manualMinutesPerRun: Math.round(manualMinutes),
      patternConfidence: Math.min(workflow.opportunity_score / 100, 0.99),
      examples: workflow.assumptions.slice(0, 3),
    },
    scores: {
      opportunityScore: Math.round(workflow.opportunity_score),
      confidenceScore: Math.round(workflow.opportunity_score * 0.95),
      repetitionScore: Math.round(workflow.opportunity_score * 0.9),
      consistencyScore: Math.round(workflow.opportunity_score * 0.85),
      dataCompletenessScore: Math.round(workflow.opportunity_score * 0.8),
      riskScore: rules.internalOnly ? 18 : 28,
    },
    riskLevel: rules.internalOnly ? "low" : "medium",
    recommendedMode: rules.approvalMode,
    currentWorkflow: workflow.current_steps.map(mapWorkflowStep),
    proposedWorkflow: workflow.automation_proposal.map(mapProposedStep),
    bottlenecks: workflow.bottlenecks.map(mapBottleneck),
    forecast: defaultForecastFromWorkflow(workflow),
    proposedRules: rules,
  };
}

function mapWorkflowStep(step: BackendWorkflowStep): WorkflowStep {
  const friction: WorkflowStep["frictionLevel"] =
    step.avg_minutes >= 3 ? "high" : step.avg_minutes >= 2 ? "medium" : "low";

  return {
    id: step.step_id,
    title: step.name,
    actor: step.is_manual ? "user" : "sloth",
    tool: step.requires_approval ? "Approval" : step.is_manual ? "Manual" : "AI",
    durationMinutes: Math.round(step.avg_minutes),
    frictionLevel: step.is_manual ? friction : "low",
    kind: step.is_manual ? "manual" : step.requires_approval ? "approval" : "ai",
    description: step.description,
  };
}

function mapProposedStep(step: BackendWorkflowStep): WorkflowStep {
  let kind: NodeKind = "ai";
  if (step.requires_approval || step.name.startsWith("[Approval]")) {
    kind = "approval";
  } else if (step.is_manual) {
    kind = "manual";
  } else if (/calendar|availability|event/i.test(step.name)) {
    kind = "calendar";
  } else if (/email|reply|send|invite/i.test(step.name)) {
    kind = "email";
  } else if (/log|metric|measure/i.test(step.name)) {
    kind = "measure";
  }

  return {
    id: step.step_id,
    title: step.name,
    actor: step.is_manual ? "user" : "sloth",
    tool: kind === "approval" ? "Approval" : kind === "manual" ? "Manual" : "AI",
    durationMinutes: Math.round(step.avg_minutes),
    kind,
    description: step.description,
  };
}

function mapBottleneck(b: BackendBottleneck): OptimisationOpportunity["bottlenecks"][0] {
  return {
    id: b.step_id,
    title: b.reason.slice(0, 60) + (b.reason.length > 60 ? "…" : ""),
    description: b.reason,
    impact: b.severity,
    minutesPerRun: 2,
  };
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

export function mapAutomationRule(rule: BackendAutomationRule): AutomationRule {
  let approvalMode: ApprovalMode = "approval_required";
  if (!rule.approval_required) {
    approvalMode = "draft";
  }

  return {
    internalOnly: rule.internal_contacts_only,
    meetingDuration: rule.meeting_duration_minutes,
    workingHoursStart: rule.working_hours_start,
    workingHoursEnd: rule.working_hours_end,
    maxSuggestedSlots: rule.max_slots_proposed,
    approvalMode,
    createTentativeEvent: true,
    escalateExternal: true,
    avoidSensitiveKeywords: true,
    avoidOutsideWorkingHours: true,
  };
}

export function toBackendAutomationRule(
  rule: AutomationRule
): BackendAutomationRule {
  return {
    internal_contacts_only: rule.internalOnly,
    meeting_duration_minutes: rule.meetingDuration,
    working_hours_start: rule.workingHoursStart,
    working_hours_end: rule.workingHoursEnd,
    approval_required: rule.approvalMode === "approval_required",
    max_slots_proposed: rule.maxSuggestedSlots,
  };
}

// ---------------------------------------------------------------------------
// Forecast
// ---------------------------------------------------------------------------

export function mapForecast(
  metrics: BackendForecastMetrics,
  fallback?: Forecast
): Forecast {
  const likely = metrics.likely_hours_saved;
  const base = fallback ?? defaultForecastFromCounts(metrics);

  return {
    conservativeHours: metrics.conservative_hours_saved,
    likelyHours: likely,
    optimisticHours: metrics.optimistic_hours_saved,
    annualHours: Math.round(likely * 12),
    eligibleCoverage: base.eligibleCoverage,
    cycleTimeBeforeDays: base.cycleTimeBeforeDays,
    cycleTimeAfterDays: base.cycleTimeAfterDays,
    manualCalendarChecksAvoided:
      metrics.eligible_runs || base.manualCalendarChecksAvoided,
    emailsAvoided: base.emailsAvoided,
  };
}

function defaultForecastFromWorkflow(
  workflow: BackendDetectedWorkflow
): Forecast {
  const likely =
    Math.round(
      ((workflow.occurrence_count *
        (averageManualMinutes(workflow.current_steps) - 3)) /
        60) *
        10
    ) / 10;

  return {
    conservativeHours: Math.round(likely * 0.7 * 10) / 10,
    likelyHours: likely || 5.2,
    optimisticHours: Math.round(likely * 1.35 * 10) / 10,
    annualHours: Math.round((likely || 5.2) * 12),
    eligibleCoverage: 0.7,
    cycleTimeBeforeDays: 2.8,
    cycleTimeAfterDays: 0.9,
    manualCalendarChecksAvoided: workflow.occurrence_count,
    emailsAvoided: workflow.occurrence_count * 2,
  };
}

function defaultForecastFromCounts(metrics: BackendForecastMetrics): Forecast {
  return {
    conservativeHours: metrics.conservative_hours_saved,
    likelyHours: metrics.likely_hours_saved,
    optimisticHours: metrics.optimistic_hours_saved,
    annualHours: Math.round(metrics.likely_hours_saved * 12),
    eligibleCoverage: 0.7,
    cycleTimeBeforeDays: 2.8,
    cycleTimeAfterDays: 0.9,
    manualCalendarChecksAvoided: metrics.eligible_runs,
    emailsAvoided: metrics.eligible_runs * 2,
  };
}

// ---------------------------------------------------------------------------
// Effectiveness
// ---------------------------------------------------------------------------

export function mapEffectiveness(
  metrics: BackendEffectivenessMetrics
): EffectivenessMetrics {
  const mock = mockEffectiveness;

  return {
    overallScore: Math.round(metrics.overall_score),
    realisedTimeScore: scaleScore(metrics.realised_time_score, 30),
    coverageScore: scaleScore(metrics.coverage_score, 20),
    reliabilityScore: scaleScore(metrics.reliability_score, 20),
    qualityScore: scaleScore(metrics.quality_score, 15),
    cycleTimeScore: scaleScore(metrics.cycle_time_score, 10),
    acceptanceScore: scaleScore(metrics.acceptance_score, 5),
    safetyStatus:
      metrics.safety_status === "ok" ? "healthy" : "needs_review",
    details: mock.details,
    safetyIncidents: mock.safetyIncidents,
  };
}

function scaleScore(value: number, max: number): number {
  return Math.round((value / max) * 100);
}

// ---------------------------------------------------------------------------
// Watcher / ingest status
// ---------------------------------------------------------------------------

export function mapWatcherStatus(
  watcher: BackendWatcherStatus,
  ingest?: BackendIngestStatus,
  connectionMode: WatcherStatus["connectionMode"] = "live"
): WatcherStatus {
  const dataSource = (watcher.data_source ??
    (ingest?.imap_configured
      ? "imap"
      : ingest?.uploaded_emails
        ? "upload"
        : "demo")) as DataSource;

  return {
    connectionMode,
    dataSource: dataSource || "unknown",
    enabled: watcher.enabled ?? true,
    running: watcher.running ?? false,
    imapConfigured:
      watcher.imap_configured ?? ingest?.imap_configured ?? false,
    cursorConfigured:
      watcher.cursor_configured ?? ingest?.cursor_configured ?? false,
    pollIntervalSeconds: watcher.poll_interval_seconds ?? 120,
    lastScanAt: watcher.last_scan_at ?? null,
    nextScanAt: watcher.next_scan_at ?? null,
    lastError: watcher.last_error ?? null,
    newMessages: watcher.new_messages ?? 0,
    notificationCount: watcher.notification_count ?? 0,
    workflowName: watcher.workflow_name ?? null,
    automationAvailable: watcher.automation_available ?? null,
    automationSummary: watcher.automation_summary ?? null,
    workflowCategory: watcher.workflow_category ?? null,
    initialScanDone: watcher.initial_scan_done ?? false,
    scanInProgress: watcher.scan_in_progress ?? false,
  };
}

export function mockWatcherStatus(): WatcherStatus {
  return {
    connectionMode: "mock",
    dataSource: "demo",
    enabled: false,
    running: false,
    imapConfigured: false,
    cursorConfigured: false,
    pollIntervalSeconds: 120,
    lastScanAt: null,
    nextScanAt: null,
    lastError: null,
    newMessages: 0,
    notificationCount: 0,
    workflowName: null,
    automationAvailable: null,
    automationSummary: null,
    workflowCategory: null,
    initialScanDone: false,
    scanInProgress: false,
  };
}

// ---------------------------------------------------------------------------
// Activation
// ---------------------------------------------------------------------------

export function mapActivationResponse(
  body: BackendActivationResponse,
  opportunityId: string,
  rules: AutomationRule,
  workflowName?: string
): ActivateAutomationResult {
  const slots = body.proposed_slots ?? [];
  const slotLabels = slots.map((slot) =>
    typeof slot === "string"
      ? slot
      : `${slot.start_time} → ${slot.end_time}`
  );

  const automation: ActiveAutomation = {
    id: body.run?.run_id ?? body.run?.id ?? `auto-${opportunityId}`,
    opportunityId,
    name: workflowName
      ? `${capitalize(workflowName)} Assistant`
      : "Workflow Assistant",
    status: "active",
    approvalMode: rules.approvalMode,
    activatedAt:
      body.run?.activated_at ??
      body.run?.created_at ??
      new Date().toISOString(),
    runsCompleted: body.run?.status === "completed" ? 1 : 0,
    effectivenessScore: 0,
    estimatedMinutesSaved: 0,
    lastActivity: new Date().toISOString(),
    rules,
  };

  return {
    automation,
    preview: {
      draftReply: body.draft_reply,
      proposedSlots: slotLabels,
      slotCount: slotLabels.length,
      tentativeEventTitle: body.tentative_event?.title,
      triggerLabel: body.draft_reply
        ? "New scheduling email detected"
        : undefined,
    },
  };
}

export function mapNotificationItem(item: BackendNotificationItem): SlothNotification {
  return {
    id: item.id,
    title: item.title,
    message: item.message,
    createdAt: item.created_at,
    read: item.read,
    opportunityId: item.opportunity_id,
    recoverableMinutesPerWeek: item.recoverable_minutes_per_week,
    action: item.action,
    status: item.status,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function averageManualMinutes(steps: BackendWorkflowStep[]): number {
  const manual = steps.filter((s) => s.is_manual);
  if (manual.length === 0) return 12;
  const total = manual.reduce((sum, s) => sum + s.avg_minutes, 0);
  return total / manual.length;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Merge backend-mapped opportunity with mock fields the backend doesn't provide yet. */
export function mergeOpportunityWithMock(
  mapped: OptimisationOpportunity,
  mock: OptimisationOpportunity
): OptimisationOpportunity {
  return {
    ...mock,
    ...mapped,
    id: mock.id,
    status: mock.status,
    detectedAt: mock.detectedAt,
    description: mapped.description || mock.description,
    evidence: {
      ...mock.evidence,
      ...mapped.evidence,
      examples:
        mapped.evidence.examples.length > 0
          ? mapped.evidence.examples
          : mock.evidence.examples,
    },
    forecast: mapped.forecast.likelyHours
      ? { ...mock.forecast, ...mapped.forecast }
      : mock.forecast,
    currentWorkflow:
      mapped.currentWorkflow.length > 0
        ? mapped.currentWorkflow
        : mock.currentWorkflow,
    proposedWorkflow:
      mapped.proposedWorkflow.length > 0
        ? mapped.proposedWorkflow
        : mock.proposedWorkflow,
    bottlenecks:
      mapped.bottlenecks.length > 0 ? mapped.bottlenecks : mock.bottlenecks,
  };
}
