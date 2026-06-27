/**
 * Seeded mock data for the SLOTH demo.
 *
 * All business data lives here (not inside components) so the backend team can
 * replace `lib/api.ts` internals with real fetch calls without touching the UI.
 *
 * The flagship workflow is "Internal Meeting Scheduling". A second proactive
 * example, "Meeting Rescheduling", drives the notification + Opportunities Inbox
 * journey.
 */

import type {
  ActiveAutomation,
  AssistantInsight,
  DemoDataset,
  EffectivenessMetrics,
  OptimisationOpportunity,
  OverviewSummary,
  SlothNotification,
} from "./types";

export const demoDataset: DemoDataset = {
  workflowName: "Internal Meeting Scheduling",
  dataSources: ["email", "calendar"],
  analysisPeriodDays: 30,
  dataSource: "demo",
  summary: {
    schedulingEmailRequests: 45,
    calendarSources: 3,
    activityHistoryDays: 30,
    emailThreads: 15,
  },
};

export const overviewSummary: OverviewSummary = {
  workflowName: "Internal Meeting Scheduling",
  opportunityId: "internal-meeting-scheduling",
  status: "Automation Opportunity Detected",
  opportunityScore: 87,
  explanation:
    "High repetition, predictable steps, low risk, and strong automation potential.",
  metrics: {
    runsPerMonth: 45,
    manualMinutesPerRun: 12,
    averageCompletionDays: 2.8,
    emailsPerMeeting: 4.2,
    monthlyCoordinationHours: 9,
  },
};

// ---------------------------------------------------------------------------
// Flagship opportunity: Internal Meeting Scheduling
// ---------------------------------------------------------------------------

const schedulingCurrentWorkflow = [
  {
    id: "s1",
    title: "Scheduling request email received",
    actor: "recipient",
    tool: "Email",
    kind: "trigger" as const,
    frictionLevel: "low" as const,
    description: "A colleague asks to set up an internal meeting.",
  },
  {
    id: "s2",
    title: "User reads email",
    actor: "user",
    tool: "Email",
    durationMinutes: 1,
    kind: "manual" as const,
    frictionLevel: "low" as const,
  },
  {
    id: "s3",
    title: "User checks calendar",
    actor: "user",
    tool: "Calendar",
    durationMinutes: 3,
    kind: "manual" as const,
    frictionLevel: "high" as const,
    description: "Manually scanning multiple calendars for openings.",
  },
  {
    id: "s4",
    title: "User finds available slots",
    actor: "user",
    tool: "Calendar",
    durationMinutes: 2,
    kind: "manual" as const,
    frictionLevel: "medium" as const,
  },
  {
    id: "s5",
    title: "User writes response",
    actor: "user",
    tool: "Email",
    durationMinutes: 3,
    kind: "manual" as const,
    frictionLevel: "high" as const,
    description: "Drafting and proposing times by hand.",
  },
  {
    id: "s6",
    title: "Recipient confirms",
    actor: "recipient",
    tool: "Email",
    kind: "manual" as const,
    frictionLevel: "medium" as const,
    description: "Often needs another round of back-and-forth.",
  },
  {
    id: "s7",
    title: "User creates calendar event",
    actor: "user",
    tool: "Calendar",
    durationMinutes: 2,
    kind: "manual" as const,
    frictionLevel: "high" as const,
  },
  {
    id: "s8",
    title: "User sends confirmation",
    actor: "user",
    tool: "Email",
    durationMinutes: 1,
    kind: "manual" as const,
    frictionLevel: "low" as const,
  },
];

const schedulingProposedWorkflow = [
  {
    id: "p1",
    title: "Incoming scheduling email",
    actor: "recipient",
    tool: "Email",
    kind: "trigger" as const,
    description: "Trigger: a new internal scheduling request arrives.",
  },
  {
    id: "p2",
    title: "Detect scheduling intent",
    actor: "sloth",
    tool: "AI analysis",
    kind: "ai" as const,
    description: "SLOTH recognises this is a meeting request.",
  },
  {
    id: "p3",
    title: "Extract meeting details",
    actor: "sloth",
    tool: "AI analysis",
    kind: "ai" as const,
    description: "Participants, duration, preferred window.",
  },
  {
    id: "p4",
    title: "Check calendar availability",
    actor: "sloth",
    tool: "Calendar",
    kind: "calendar" as const,
    description: "Reads availability across connected calendars.",
  },
  {
    id: "p5",
    title: "Apply meeting rules",
    actor: "sloth",
    tool: "AI analysis",
    kind: "ai" as const,
    description: "Your working hours, duration and safety rules.",
  },
  {
    id: "p6",
    title: "Suggest up to 3 slots",
    actor: "sloth",
    tool: "AI analysis",
    kind: "ai" as const,
  },
  {
    id: "p7",
    title: "Draft email reply",
    actor: "sloth",
    tool: "Email",
    kind: "email" as const,
    description: "A ready-to-send reply proposing the slots.",
  },
  {
    id: "p8",
    title: "Human approval",
    actor: "user",
    tool: "Approval",
    kind: "approval" as const,
    description: "You review and approve before anything sends.",
  },
  {
    id: "p9",
    title: "Send reply",
    actor: "sloth",
    tool: "Email",
    kind: "email" as const,
  },
  {
    id: "p10",
    title: "Create tentative event on confirmation",
    actor: "sloth",
    tool: "Calendar",
    kind: "calendar" as const,
  },
  {
    id: "p11",
    title: "Log outcome & metrics",
    actor: "sloth",
    tool: "Measurement",
    kind: "measure" as const,
    description: "Records time saved and effectiveness signals.",
  },
];

export const internalSchedulingOpportunity: OptimisationOpportunity = {
  id: "internal-meeting-scheduling",
  workflowName: "Internal meeting scheduling",
  description:
    "Coordinating internal meetings from email requests through to a confirmed calendar event.",
  status: "ready_to_review",
  detectedAt: "2026-06-21T09:00:00Z",
  sourceSystems: ["email", "calendar"],
  frequency: { value: 45, unit: "month", trendPercentage: 8 },
  evidence: {
    repeatedRuns: 45,
    averageEmailsPerRun: 4.2,
    averageCycleTimeHours: 67,
    manualMinutesPerRun: 12,
    patternConfidence: 0.89,
    examples: [
      "“Can we find 30 minutes next week to review the roadmap?”",
      "“Looking to grab time with the design team — what works?”",
      "“Need a quick sync on the launch checklist this week.”",
    ],
  },
  scores: {
    opportunityScore: 87,
    confidenceScore: 89,
    repetitionScore: 92,
    consistencyScore: 84,
    dataCompletenessScore: 88,
    riskScore: 18,
  },
  riskLevel: "low",
  recommendedMode: "approval_required",
  currentWorkflow: schedulingCurrentWorkflow,
  proposedWorkflow: schedulingProposedWorkflow,
  bottlenecks: [
    {
      id: "b1",
      title: "Checking availability",
      description:
        "Scanning several calendars by hand for open slots is the single largest manual cost.",
      impact: "high",
      minutesPerRun: 3,
    },
    {
      id: "b2",
      title: "Drafting replies",
      description: "Writing tailored responses with proposed times each run.",
      impact: "high",
      minutesPerRun: 3,
    },
    {
      id: "b3",
      title: "Event creation",
      description: "Manually transferring agreed times into the calendar.",
      impact: "medium",
      minutesPerRun: 2,
    },
    {
      id: "b4",
      title: "Repeated email exchanges",
      description: "An average of 4.2 emails per meeting to reach agreement.",
      impact: "medium",
      minutesPerRun: 2,
    },
  ],
  forecast: {
    conservativeHours: 3.5,
    likelyHours: 5.2,
    optimisticHours: 7.0,
    annualHours: 62,
    eligibleCoverage: 0.7,
    cycleTimeBeforeDays: 2.8,
    cycleTimeAfterDays: 0.9,
    manualCalendarChecksAvoided: 45,
    emailsAvoided: 90,
  },
  proposedRules: {
    internalOnly: true,
    meetingDuration: 30,
    workingHoursStart: "09:00",
    workingHoursEnd: "17:00",
    maxSuggestedSlots: 3,
    approvalMode: "approval_required",
    createTentativeEvent: true,
    escalateExternal: true,
    avoidSensitiveKeywords: true,
    avoidOutsideWorkingHours: true,
  },
};

// ---------------------------------------------------------------------------
// Proactive opportunity: Meeting Rescheduling
// ---------------------------------------------------------------------------

const reschedulingCurrentWorkflow = [
  {
    id: "r1",
    title: "Reschedule request received",
    actor: "recipient",
    tool: "Email",
    kind: "trigger" as const,
    frictionLevel: "low" as const,
  },
  {
    id: "r2",
    title: "User reads email",
    actor: "user",
    tool: "Email",
    durationMinutes: 1,
    kind: "manual" as const,
    frictionLevel: "low" as const,
  },
  {
    id: "r3",
    title: "User checks calendar for conflicts",
    actor: "user",
    tool: "Calendar",
    durationMinutes: 3,
    kind: "manual" as const,
    frictionLevel: "high" as const,
  },
  {
    id: "r4",
    title: "User finds new slots",
    actor: "user",
    tool: "Calendar",
    durationMinutes: 2,
    kind: "manual" as const,
    frictionLevel: "medium" as const,
  },
  {
    id: "r5",
    title: "User replies with options",
    actor: "user",
    tool: "Email",
    durationMinutes: 3,
    kind: "manual" as const,
    frictionLevel: "high" as const,
  },
  {
    id: "r6",
    title: "Recipient confirms new time",
    actor: "recipient",
    tool: "Email",
    kind: "manual" as const,
    frictionLevel: "medium" as const,
  },
  {
    id: "r7",
    title: "User updates calendar event",
    actor: "user",
    tool: "Calendar",
    durationMinutes: 2,
    kind: "manual" as const,
    frictionLevel: "high" as const,
  },
];

export const meetingReschedulingOpportunity: OptimisationOpportunity = {
  id: "meeting-rescheduling",
  workflowName: "Meeting rescheduling",
  description:
    "Handling requests to move an existing meeting: re-checking availability and updating the event.",
  status: "detected",
  detectedAt: "2026-06-25T14:20:00Z",
  sourceSystems: ["email", "calendar"],
  frequency: { value: 8, unit: "week", trendPercentage: 15 },
  evidence: {
    repeatedRuns: 8,
    averageEmailsPerRun: 3.2,
    averageCycleTimeHours: 33.6,
    manualMinutesPerRun: 11,
    patternConfidence: 0.91,
    examples: [
      "“Something came up — can we push our 2pm to later this week?”",
      "“Sorry, need to move tomorrow’s sync. Any other time work?”",
      "“Can we reschedule the review? This slot no longer works.”",
      "“Could we shift our 1:1 by a day?”",
      "“Let’s find a new time for the planning call.”",
      "“I have a conflict — proposing we move our meeting.”",
      "“Need to bump our catch-up, sorry for the churn.”",
      "“Can we reschedule to next week instead?”",
    ],
  },
  scores: {
    opportunityScore: 82,
    confidenceScore: 91,
    repetitionScore: 88,
    consistencyScore: 80,
    dataCompletenessScore: 82,
    riskScore: 22,
  },
  riskLevel: "low",
  recommendedMode: "approval_required",
  currentWorkflow: reschedulingCurrentWorkflow,
  proposedWorkflow: schedulingProposedWorkflow.map((s) => ({ ...s })),
  bottlenecks: [
    {
      id: "rb1",
      title: "Re-checking availability",
      description:
        "Each reschedule forces a fresh manual scan for conflicts across calendars.",
      impact: "high",
      minutesPerRun: 3,
    },
    {
      id: "rb2",
      title: "Drafting options",
      description: "Composing replies with alternative times every time.",
      impact: "high",
      minutesPerRun: 3,
    },
    {
      id: "rb3",
      title: "Updating the event",
      description: "Editing the existing calendar entry by hand.",
      impact: "medium",
      minutesPerRun: 2,
    },
  ],
  forecast: {
    conservativeHours: 2.6,
    likelyHours: 3.5,
    optimisticHours: 4.4,
    annualHours: 42,
    eligibleCoverage: 0.68,
    cycleTimeBeforeDays: 1.4,
    cycleTimeAfterDays: 0.5,
    manualCalendarChecksAvoided: 32,
    emailsAvoided: 64,
  },
  proposedRules: {
    internalOnly: true,
    meetingDuration: 30,
    workingHoursStart: "09:00",
    workingHoursEnd: "17:00",
    maxSuggestedSlots: 3,
    approvalMode: "approval_required",
    createTentativeEvent: true,
    escalateExternal: true,
    avoidSensitiveKeywords: true,
    avoidOutsideWorkingHours: true,
  },
};

// ---------------------------------------------------------------------------
// Lighter seeded opportunities (for the inbox table)
// ---------------------------------------------------------------------------

export const weeklyRemindersOpportunity: OptimisationOpportunity = {
  id: "weekly-project-reminders",
  workflowName: "Weekly project reminders",
  description:
    "Sending recurring status-update nudges to project contributors each week.",
  status: "ready_to_review",
  detectedAt: "2026-06-19T08:00:00Z",
  sourceSystems: ["email"],
  frequency: { value: 6, unit: "month", trendPercentage: 0 },
  evidence: {
    repeatedRuns: 6,
    averageEmailsPerRun: 1,
    averageCycleTimeHours: 0.3,
    manualMinutesPerRun: 12,
    patternConfidence: 0.79,
    examples: [
      "“Friendly reminder to share your weekly update.”",
      "“Please send your status before our sync.”",
    ],
  },
  scores: {
    opportunityScore: 76,
    confidenceScore: 79,
    repetitionScore: 90,
    consistencyScore: 86,
    dataCompletenessScore: 70,
    riskScore: 12,
  },
  riskLevel: "low",
  recommendedMode: "draft",
  currentWorkflow: [],
  proposedWorkflow: [],
  bottlenecks: [],
  forecast: {
    conservativeHours: 0.8,
    likelyHours: 1.2,
    optimisticHours: 1.6,
    annualHours: 14,
    eligibleCoverage: 0.8,
    cycleTimeBeforeDays: 0.1,
    cycleTimeAfterDays: 0.05,
    manualCalendarChecksAvoided: 0,
    emailsAvoided: 6,
  },
  proposedRules: {
    internalOnly: true,
    meetingDuration: 30,
    workingHoursStart: "09:00",
    workingHoursEnd: "17:00",
    maxSuggestedSlots: 3,
    approvalMode: "draft",
    createTentativeEvent: false,
    escalateExternal: true,
    avoidSensitiveKeywords: true,
    avoidOutsideWorkingHours: true,
  },
};

export const followUpsOpportunity: OptimisationOpportunity = {
  id: "post-meeting-follow-ups",
  workflowName: "Post-meeting follow-ups",
  description:
    "Drafting summary-and-next-steps emails after recurring internal meetings.",
  status: "needs_review",
  detectedAt: "2026-06-17T16:30:00Z",
  sourceSystems: ["email", "calendar"],
  frequency: { value: 12, unit: "month", trendPercentage: -4 },
  evidence: {
    repeatedRuns: 12,
    averageEmailsPerRun: 1.2,
    averageCycleTimeHours: 1.5,
    manualMinutesPerRun: 12,
    patternConfidence: 0.72,
    examples: [
      "“Thanks all — summary and action items below.”",
      "“Recap from today's sync and owners for each item.”",
    ],
  },
  scores: {
    opportunityScore: 74,
    confidenceScore: 72,
    repetitionScore: 80,
    consistencyScore: 68,
    dataCompletenessScore: 66,
    riskScore: 34,
  },
  riskLevel: "medium",
  recommendedMode: "draft",
  currentWorkflow: [],
  proposedWorkflow: [],
  bottlenecks: [],
  forecast: {
    conservativeHours: 1.6,
    likelyHours: 2.4,
    optimisticHours: 3.2,
    annualHours: 29,
    eligibleCoverage: 0.6,
    cycleTimeBeforeDays: 0.2,
    cycleTimeAfterDays: 0.1,
    manualCalendarChecksAvoided: 0,
    emailsAvoided: 12,
  },
  proposedRules: {
    internalOnly: true,
    meetingDuration: 30,
    workingHoursStart: "09:00",
    workingHoursEnd: "17:00",
    maxSuggestedSlots: 3,
    approvalMode: "draft",
    createTentativeEvent: false,
    escalateExternal: true,
    avoidSensitiveKeywords: true,
    avoidOutsideWorkingHours: true,
  },
};

export const opportunities: OptimisationOpportunity[] = [
  internalSchedulingOpportunity,
  meetingReschedulingOpportunity,
  weeklyRemindersOpportunity,
  followUpsOpportunity,
];

// ---------------------------------------------------------------------------
// Effectiveness (after-activation) data
// ---------------------------------------------------------------------------

export const effectivenessMetrics: EffectivenessMetrics = {
  overallScore: 87,
  realisedTimeScore: 91,
  coverageScore: 80,
  reliabilityScore: 94,
  qualityScore: 97,
  cycleTimeScore: 88,
  acceptanceScore: 88,
  safetyStatus: "healthy",
  details: {
    realisedMinutes: 300,
    forecastMinutes: 330,
    coverageRuns: 32,
    coverageEligible: 40,
    successfulRuns: 30,
    totalRuns: 32,
    correctionsNeeded: 1,
    cycleTimeBeforeDays: 2.8,
    cycleTimeAfterDays: 1.0,
    acceptancePercentage: 88,
  },
  safetyIncidents: [],
};

export const activeAutomations: ActiveAutomation[] = [
  {
    id: "auto-internal-scheduling",
    opportunityId: "internal-meeting-scheduling",
    name: "Internal Meeting Scheduling Assistant",
    status: "active",
    approvalMode: "approval_required",
    activatedAt: "2026-06-10T10:00:00Z",
    runsCompleted: 32,
    effectivenessScore: 87,
    estimatedMinutesSaved: 300,
    lastActivity: "2026-06-27T08:15:00Z",
    rules: internalSchedulingOpportunity.proposedRules,
  },
];

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const notifications: SlothNotification[] = [
  {
    id: "n1",
    title: "New optimisation opportunity detected",
    message:
      "You manually handled 8 similar meeting-rescheduling requests this week.",
    createdAt: "2026-06-25T14:25:00Z",
    read: false,
    opportunityId: "meeting-rescheduling",
    recoverableMinutesPerWeek: 48,
  },
  {
    id: "n2",
    title: "Workflow ready to review",
    message:
      "Internal meeting scheduling has enough signal to design a safe automation.",
    createdAt: "2026-06-21T09:05:00Z",
    read: false,
    opportunityId: "internal-meeting-scheduling",
  },
  {
    id: "n3",
    title: "Automation performing well",
    message:
      "Internal Meeting Scheduling Assistant is saving close to its forecast.",
    createdAt: "2026-06-24T11:00:00Z",
    read: true,
    opportunityId: "internal-meeting-scheduling",
  },
];

// ---------------------------------------------------------------------------
// Assistant insights (contextual, pre-seeded — not a generic chatbot)
// ---------------------------------------------------------------------------

export const assistantInsights: AssistantInsight[] = [
  {
    id: "ai-landing",
    context: "landing",
    title: "SLOTH Assistant",
    message: "I found 3 workflows that may be worth optimising.",
    suggestedActions: ["Use Demo Dataset", "See how it works"],
  },
  {
    id: "ai-setup",
    context: "setup",
    title: "SLOTH Assistant",
    message:
      "I’ll look for repeated scheduling patterns, manual coordination steps, and safe ways to reduce effort.",
    suggestedActions: ["Analyse workflow"],
  },
  {
    id: "ai-overview",
    context: "overview",
    title: "SLOTH Assistant",
    message:
      "I found a repeatable scheduling workflow. The largest manual effort comes from checking availability and drafting responses.",
    suggestedActions: ["Review opportunity", "Show evidence", "How would this work?"],
  },
  {
    id: "ai-opportunity",
    context: "opportunity",
    title: "SLOTH Assistant",
    message:
      "I found the same sequence repeated across eight conversations: a scheduling change, a manual calendar check, several replies, and an updated event.",
    suggestedActions: ["Show evidence", "See current workflow"],
  },
  {
    id: "ai-workflow",
    context: "workflow",
    title: "SLOTH Assistant",
    message:
      "I mapped this workflow into seven manual steps. The biggest time cost is checking availability and drafting replies.",
    suggestedActions: ["See proposed automation"],
  },
  {
    id: "ai-automation",
    context: "automation",
    title: "SLOTH Assistant",
    message:
      "I recommend starting in approval mode so you stay in control of every email. Once it performs reliably, you can expand to trusted internal contacts.",
    suggestedActions: ["Forecast impact"],
  },
  {
    id: "ai-forecast",
    context: "forecast",
    title: "SLOTH Assistant",
    message:
      "These are estimates based on observed workflow frequency and your editable assumptions — not guarantees.",
    suggestedActions: ["How SLOTH calculated this", "Activate safely"],
  },
  {
    id: "ai-effectiveness",
    context: "effectiveness",
    title: "SLOTH Assistant",
    message:
      "This automation is saving close to its forecasted time. You may be ready to expand it to trusted internal contacts.",
    suggestedActions: ["View safety status"],
  },
];
