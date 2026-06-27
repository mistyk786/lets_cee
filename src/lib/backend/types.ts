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
  automation_available?: boolean;
  workflow_category?: string;
  automation_summary?: string;
  automatable_actions?: string[];
  detected_patterns?: string[];
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
  event_id?: string;
  start_time?: string;
  end_time?: string;
  start?: string;
  end?: string;
  status?: string;
};

export type BackendTimeSlot = {
  start_time: string;
  end_time: string;
};

export type BackendAutomationRun = {
  run_id?: string;
  id?: string;
  status?: string;
  activated_at?: string;
  created_at?: string;
  email_subject?: string;
  proposed_slot_count?: number;
  created_event_id?: string;
};

/** POST /api/activate-automation */
export type BackendActivationResponse = {
  draft_reply?: string;
  processed_email_subject?: string;
  processed_email_sender?: string;
  processed_email_body?: string;
  reply_source?: "cursor" | "template";
  proposed_slots?: BackendTimeSlot[] | string[];
  tentative_event?: BackendTentativeEvent;
  run?: BackendAutomationRun;
  rules?: BackendAutomationRule;
};

export type BackendNotificationItem = {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  opportunity_id?: string;
  recoverable_minutes_per_week?: number;
  action?: "automate" | "review";
  status?: "pending" | "completed";
};

export type BackendAutomateNotificationResponse = {
  notification: BackendNotificationItem;
  activation: BackendActivationResponse;
};

export type BackendPrototypeBootstrapResponse = {
  workflow_name: string;
  opportunity_score: number;
  notifications: BackendNotificationItem[];
  demo_mode: boolean;
  data_source?: string;
  automation_available?: boolean;
  automation_summary?: string;
  workflow_category?: string;
  automatable_actions?: string[];
  workflow?: BackendDetectedWorkflow;
};

/** GET /api/watcher/status — background inbox poll state. */
export type BackendWatcherStatus = {
  enabled?: boolean;
  running?: boolean;
  poll_interval_seconds?: number;
  last_scan_at?: string | null;
  next_scan_at?: string | null;
  last_error?: string | null;
  data_source?: "demo" | "imap" | "upload";
  imap_configured?: boolean;
  cursor_configured?: boolean;
  demo_mode?: boolean;
  new_messages?: number;
  notification_count?: number;
  workflow_name?: string | null;
  automation_available?: boolean | null;
  automation_summary?: string | null;
  workflow_category?: string | null;
  initial_scan_done?: boolean;
  scan_in_progress?: boolean;
};

/** GET /api/ingest/status — configured data sources. */
export type BackendIngestStatus = {
  cursor_configured?: boolean;
  imap_configured?: boolean;
  uploaded_emails?: boolean;
  uploaded_calendar?: boolean;
  demo_available?: boolean;
};
