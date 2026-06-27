/**
 * Backend API response shapes (snake_case, mirrors backend/app/schemas.py).
 * Do not use these in UI components — map to src/lib/types.ts via mappers.ts.
 */

export type BackendWorkflowStep = {
  step_id: string;
  name: string;
  description: string;
  is_manual: boolean;
  avg_minutes: number;
  is_automatable: boolean;
  requires_approval: boolean;
};

export type BackendBottleneck = {
  step_id: string;
  reason: string;
  severity: "low" | "medium" | "high";
};

export type BackendAutomationRule = {
  internal_contacts_only: boolean;
  meeting_duration_minutes: number;
  working_hours_start: string;
  working_hours_end: string;
  approval_required: boolean;
  max_slots_proposed: number;
};

export type BackendDetectedWorkflow = {
  workflow_name: string;
  occurrence_count: number;
  current_steps: BackendWorkflowStep[];
  bottlenecks: BackendBottleneck[];
  opportunity_score: number;
  automation_proposal: BackendWorkflowStep[];
  assumptions: string[];
  automation_rules: BackendAutomationRule;
};

export type BackendForecastMetrics = {
  eligible_runs: number;
  manual_minutes_per_run: number;
  review_minutes_per_run: number;
  exception_minutes: number;
  conservative_hours_saved: number;
  likely_hours_saved: number;
  optimistic_hours_saved: number;
};

export type BackendEffectivenessMetrics = {
  realised_time_score: number;
  coverage_score: number;
  reliability_score: number;
  quality_score: number;
  cycle_time_score: number;
  acceptance_score: number;
  safety_status: "ok" | "needs_review";
  overall_score: number;
  recommendation: string;
};

/** GET /api/demo-data — raw Member 3 payload before summarisation. */
export type BackendDemoDataRaw = {
  emails?: Array<{ subject?: string; thread_id?: string; body?: string }>;
  calendar_events?: Array<{
    id?: string;
    calendar_id?: string;
    title?: string;
  }>;
  analysis_period_days?: number;
};

export type BackendTentativeEvent = {
  title?: string;
  start?: string;
  end?: string;
  status?: string;
};

export type BackendAutomationRun = {
  id?: string;
  status?: string;
  created_at?: string;
};

/** POST /api/activate-automation */
export type BackendActivationResponse = {
  draft_reply?: string;
  proposed_slots?: string[];
  tentative_event?: BackendTentativeEvent;
  run?: BackendAutomationRun;
};
