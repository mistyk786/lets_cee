/**
 * Shared SLOTH frontend types.
 *
 * These describe the data contracts between the SLOTH UI and the future
 * backend / AI services. The mock API in `lib/api.ts` returns these shapes,
 * so swapping mocks for real `fetch` calls should require no UI changes.
 */

export type Actor = "user" | "recipient" | "sloth";

export type NodeKind =
  | "trigger"
  | "manual"
  | "ai"
  | "calendar"
  | "approval"
  | "email"
  | "measure";

export type WorkflowStep = {
  id: string;
  title: string;
  actor: string;
  tool: string;
  durationMinutes?: number;
  frictionLevel?: "low" | "medium" | "high";
  /** Used by the proposed (future-state) diagram to colour-code node types. */
  kind?: NodeKind;
  description?: string;
};

export type ApprovalMode =
  | "draft"
  | "approval_required"
  | "trusted_internal_auto_send";

export type AutomationRule = {
  internalOnly: boolean;
  meetingDuration: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  maxSuggestedSlots: number;
  approvalMode: ApprovalMode;
  createTentativeEvent: boolean;
  escalateExternal: boolean;
  avoidSensitiveKeywords: boolean;
  avoidOutsideWorkingHours: boolean;
};

export type Forecast = {
  conservativeHours: number;
  likelyHours: number;
  optimisticHours: number;
  annualHours: number;
  eligibleCoverage: number; // 0..1
  cycleTimeBeforeDays: number;
  cycleTimeAfterDays: number;
  manualCalendarChecksAvoided: number;
  emailsAvoided: number;
};

export type EffectivenessMetrics = {
  overallScore: number;
  realisedTimeScore: number;
  coverageScore: number;
  reliabilityScore: number;
  qualityScore: number;
  cycleTimeScore: number;
  acceptanceScore: number;
  safetyStatus: "healthy" | "needs_review";
  /** Concrete figures behind the scores, used by metric cards. */
  details: {
    realisedMinutes: number;
    forecastMinutes: number;
    coverageRuns: number;
    coverageEligible: number;
    successfulRuns: number;
    totalRuns: number;
    correctionsNeeded: number;
    cycleTimeBeforeDays: number;
    cycleTimeAfterDays: number;
    acceptancePercentage: number;
  };
  safetyIncidents: SafetyIncident[];
};

export type SafetyIncident = {
  id: string;
  type:
    | "wrong_recipient"
    | "privacy"
    | "calendar_conflict"
    | "repeated_failure";
  severity: "info" | "warning" | "critical";
  message: string;
  occurredAt: string;
};

export type OpportunityStatus =
  | "detected"
  | "ready_to_review"
  | "configured"
  | "active"
  | "measuring"
  | "needs_review"
  | "paused";

export type RiskLevel = "low" | "medium" | "high";

export type OptimisationOpportunity = {
  id: string;
  workflowName: string;
  description: string;
  status: OpportunityStatus;
  detectedAt: string;
  sourceSystems: ("email" | "calendar")[];

  frequency: {
    value: number;
    unit: "day" | "week" | "month";
    trendPercentage: number;
  };

  evidence: {
    repeatedRuns: number;
    averageEmailsPerRun: number;
    averageCycleTimeHours: number;
    manualMinutesPerRun: number;
    patternConfidence: number; // 0..1
    examples: string[];
  };

  scores: {
    opportunityScore: number;
    confidenceScore: number;
    repetitionScore: number;
    consistencyScore: number;
    dataCompletenessScore: number;
    riskScore: number; // lower is safer
  };

  riskLevel: RiskLevel;
  recommendedMode: ApprovalMode;

  currentWorkflow: WorkflowStep[];
  proposedWorkflow: WorkflowStep[];
  bottlenecks: Bottleneck[];

  forecast: Forecast;
  proposedRules: AutomationRule;
};

export type Bottleneck = {
  id: string;
  title: string;
  description: string;
  impact: "low" | "medium" | "high";
  minutesPerRun: number;
};

export type AssistantContext =
  | "overview"
  | "opportunity"
  | "workflow"
  | "automation"
  | "forecast"
  | "effectiveness"
  | "landing"
  | "setup";

export type AssistantInsight = {
  id: string;
  context: AssistantContext;
  title: string;
  message: string;
  suggestedActions: string[];
};

export type SlothNotification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  opportunityId?: string;
  recoverableMinutesPerWeek?: number;
  /** Prototype: one-click automation vs dashboard review. */
  action?: "automate" | "review";
  status?: "pending" | "completed";
};

export type DemoDataset = {
  workflowName: string;
  dataSources: ("email" | "calendar")[];
  analysisPeriodDays: number;
  summary: {
    schedulingEmailRequests: number;
    calendarSources: number;
    activityHistoryDays: number;
  };
};

export type ActiveAutomation = {
  id: string;
  opportunityId: string;
  name: string;
  status: "active" | "paused" | "needs_review";
  approvalMode: ApprovalMode;
  activatedAt: string;
  runsCompleted: number;
  effectivenessScore: number;
  estimatedMinutesSaved: number;
  lastActivity: string;
  rules: AutomationRule;
};

/** Returned by POST /api/activate-automation (backend + mapped preview). */
export type ActivationPreview = {
  triggerLabel?: string;
  draftReply?: string;
  proposedSlots?: string[];
  slotCount?: number;
  tentativeEventTitle?: string;
};

export type ActivateAutomationResult = {
  automation: ActiveAutomation;
  preview?: ActivationPreview;
};

export type OverviewSummary = {
  workflowName: string;
  status: string;
  opportunityScore: number;
  explanation: string;
  metrics: {
    runsPerMonth: number;
    manualMinutesPerRun: number;
    averageCompletionDays: number;
    emailsPerMeeting: number;
    monthlyCoordinationHours: number;
  };
  automationAvailable?: boolean;
  automatableActions?: string[];
  workflowCategory?: string;
};

export type DataSource = "demo" | "imap" | "upload" | "unknown";

/** Live backend connection + inbox watcher state (GET /api/watcher/status). */
export type WatcherStatus = {
  /** mock = VITE_USE_MOCK_API or no base URL; live = backend reachable; offline = configured but down */
  connectionMode: "mock" | "live" | "offline";
  dataSource: DataSource;
  enabled: boolean;
  running: boolean;
  imapConfigured: boolean;
  cursorConfigured: boolean;
  pollIntervalSeconds: number;
  lastScanAt: string | null;
  nextScanAt: string | null;
  lastError: string | null;
  newMessages: number;
  notificationCount: number;
  workflowName: string | null;
  automationAvailable: boolean | null;
  automationSummary: string | null;
  workflowCategory: string | null;
  initialScanDone: boolean;
  scanInProgress: boolean;
};
