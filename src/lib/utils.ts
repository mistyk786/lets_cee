import type {
  ApprovalMode,
  AutomationRule,
  OpportunityStatus,
  RiskLevel,
} from "./types";

/** Tailwind-friendly className combiner. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date("2026-06-27T11:00:00Z");
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function frequencyLabel(freq: {
  value: number;
  unit: "day" | "week" | "month";
}): string {
  return `${freq.value}/${freq.unit}`;
}

const STATUS_META: Record<
  OpportunityStatus,
  { label: string; tone: "neutral" | "info" | "success" | "warning" | "accent" }
> = {
  detected: { label: "New", tone: "accent" },
  ready_to_review: { label: "Ready to review", tone: "info" },
  configured: { label: "Configured", tone: "info" },
  active: { label: "Active", tone: "success" },
  measuring: { label: "Measuring", tone: "info" },
  needs_review: { label: "Needs review", tone: "warning" },
  paused: { label: "Paused", tone: "neutral" },
};

export function statusMeta(status: OpportunityStatus) {
  return STATUS_META[status];
}

export function riskMeta(risk: RiskLevel): {
  label: string;
  tone: "success" | "warning" | "neutral";
} {
  switch (risk) {
    case "low":
      return { label: "Low", tone: "success" };
    case "medium":
      return { label: "Medium", tone: "warning" };
    case "high":
      return { label: "High", tone: "neutral" };
  }
}

export const APPROVAL_MODE_LABELS: Record<ApprovalMode, string> = {
  draft: "Draft only",
  approval_required: "Require approval before send",
  trusted_internal_auto_send: "Auto-send for trusted internal contacts",
};

export function scoreBand(score: number): {
  label: string;
  description: string;
  tone: "success" | "info" | "warning" | "danger";
} {
  if (score >= 90)
    return {
      label: "Excellent",
      description: "Expand carefully",
      tone: "success",
    };
  if (score >= 75)
    return {
      label: "Performing well",
      description: "Maintain and monitor",
      tone: "info",
    };
  if (score >= 50)
    return {
      label: "Needs refinement",
      description: "Review exceptions and rules",
      tone: "warning",
    };
  return {
    label: "Needs review",
    description: "Pause or redesign",
    tone: "danger",
  };
}

/**
 * Builds the human-readable "WHEN / DO / REQUIRE / THEN" rule summary that
 * updates live as the user edits automation rules.
 */
export function buildRuleSummary(rule: AutomationRule): {
  when: string;
  doStep: string;
  require: string;
  then: string;
} {
  const scope = rule.internalOnly ? "an internal" : "an internal or external";
  const when = `WHEN ${scope} email requests a ${rule.meetingDuration}-minute meeting`;
  const doStep = `DO find up to ${rule.maxSuggestedSlots} available slot${
    rule.maxSuggestedSlots === 1 ? "" : "s"
  } within ${rule.workingHoursStart}–${rule.workingHoursEnd} and draft a reply`;

  let require: string;
  switch (rule.approvalMode) {
    case "draft":
      require = "REQUIRE nothing to send — leave the draft for you to send manually";
      break;
    case "approval_required":
      require = "REQUIRE human approval before sending";
      break;
    case "trusted_internal_auto_send":
      require = "REQUIRE approval for external contacts; auto-send for trusted internal contacts";
      break;
  }

  const then = rule.createTentativeEvent
    ? "THEN create a tentative calendar event after confirmation"
    : "THEN leave calendar changes to you";

  return { when, doStep, require, then };
}

/** Compute a simple forecast preview from editable rules + base assumptions. */
export function previewSavings(
  rule: AutomationRule,
  base: { runsPerMonth: number; manualMinutesPerRun: number }
): { likelyHoursPerMonth: number; reviewMinutesPerRun: number } {
  const reviewMinutesPerRun =
    rule.approvalMode === "approval_required"
      ? 3
      : rule.approvalMode === "draft"
        ? 5
        : 1.5;
  const coverage = rule.internalOnly ? 0.7 : 0.85;
  const savedPerRun = Math.max(
    0,
    base.manualMinutesPerRun - reviewMinutesPerRun
  );
  const minutes = base.runsPerMonth * coverage * savedPerRun;
  return {
    likelyHoursPerMonth: Math.round((minutes / 60) * 10) / 10,
    reviewMinutesPerRun,
  };
}

export function clamp(n: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, n));
}
