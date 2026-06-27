/**
 * SLOTH frontend API adapter.
 *
 * Single seam between UI and data. When VITE_API_BASE_URL is set, each method
 * calls the real backend and maps snake_case responses → frontend types.
 * On any failure (or when VITE_USE_MOCK_API=true), falls back to mock data.
 */

import type {
  BackendActivationResponse,
  BackendAutomateNotificationResponse,
  BackendDemoDataRaw,
  BackendDetectedWorkflow,
  BackendEffectivenessMetrics,
  BackendForecastMetrics,
  BackendIngestStatus,
  BackendWatcherStatus,
  BackendPrototypeBootstrapResponse,
  BackendWorkflowStep,
} from "./backend/types";
import { fetchWithFallback, getApiBaseUrl, isBackendConfigured } from "./http";
import {
  mapActivationResponse,
  mapDemoDataRaw,
  mapDetectedWorkflowToOpportunity,
  mapEffectiveness,
  mapForecast,
  mapNotificationItem,
  mapOverviewSummary,
  mapWatcherStatus,
  mockWatcherStatus,
  toBackendAutomationRule,
} from "./mappers";
import {
  activeAutomations,
  assistantInsights,
  demoDataset,
  effectivenessMetrics,
  notifications,
  opportunities,
  overviewSummary,
} from "./mockData";
import { delay, previewSavings } from "./utils";
import type {
  ActivateAutomationResult,
  ActiveAutomation,
  AssistantContext,
  AssistantInsight,
  AutomationRule,
  DemoDataset,
  EffectivenessMetrics,
  Forecast,
  OptimisationOpportunity,
  OverviewSummary,
  SlothNotification,
  RecentInboxResult,
  WatcherStatus,
  WorkflowStep,
} from "./types";

export const ENDPOINTS = {
  demoData: "/api/demo-data",
  analyseWorkflow: "/api/analyse-workflow",
  generateAutomation: "/api/generate-automation",
  forecast: "/api/forecast",
  activateAutomation: "/api/activate-automation",
  effectiveness: "/api/effectiveness",
  watcherStatus: "/api/watcher/status",
  watcherScan: "/api/watcher/scan",
  ingestStatus: "/api/ingest/status",
  recentInbox: "/api/inbox/recent",
  opportunities: "/api/opportunities",
  opportunity: (id: string) => `/api/opportunities/${id}`,
  reviewOpportunity: (id: string) => `/api/opportunities/${id}/review`,
  configureOpportunity: (id: string) => `/api/opportunities/${id}/configure`,
  activateOpportunity: (id: string) => `/api/opportunities/${id}/activate`,
  pauseOpportunity: (id: string) => `/api/opportunities/${id}/pause`,
  opportunityMetrics: (id: string) => `/api/opportunities/${id}/metrics`,
  notifications: "/api/notifications",
  automateNotification: (id: string) => `/api/notifications/${id}/automate`,
  prototypeBootstrap: "/api/prototype/bootstrap",
  analysisCurrent: "/api/analysis/current",
} as const;

const LATENCY = 350;

/** Default watcher poll interval for AppContext (15s). Override via VITE_WATCHER_POLL_MS. */
export const WATCHER_POLL_MS = Number(
  import.meta.env.VITE_WATCHER_POLL_MS ?? 15_000
);

let lastDetectedWorkflow: BackendDetectedWorkflow | null = null;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function mockDelay(ms = LATENCY): Promise<void> {
  if (!isBackendConfigured()) {
    await delay(ms);
  }
}

export type BootstrapResult = {
  workflowName: string;
  opportunityScore: number;
  notifications: SlothNotification[];
  automationAvailable: boolean;
  automationSummary: string;
};

function mapBootstrapResponse(
  body: BackendPrototypeBootstrapResponse
): BootstrapResult {
  if (body.workflow) lastDetectedWorkflow = body.workflow;
  return {
    workflowName: body.workflow_name,
    opportunityScore: body.opportunity_score,
    notifications: body.notifications.map(mapNotificationItem),
    automationAvailable: body.automation_available !== false,
    automationSummary: body.automation_summary ?? "",
  };
}

async function loadCachedBootstrap(): Promise<BootstrapResult | null> {
  const body = await fetchLiveJson<BackendPrototypeBootstrapResponse>(
    `${ENDPOINTS.prototypeBootstrap}?force=false`,
    { method: "POST" }
  );
  return body ? mapBootstrapResponse(body) : null;
}

async function fetchLiveJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!isBackendConfigured()) return null;
  try {
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
    });
    if (!res.ok) return null;
    if (res.status === 204) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchLiveOrMock<T>(
  path: string,
  mockFallback: () => T | Promise<T>,
  options: Parameters<typeof fetchWithFallback<T>>[2] = {}
): Promise<T> {
  if (!isBackendConfigured()) {
    return mockFallback();
  }
  try {
    const { body, headers, map, ...rest } = options;
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
      ...rest,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(String(res.status));
    const raw: unknown = await res.json();
    return map ? map(raw) : (raw as T);
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn(`[SLOTH api] ${path} failed in live mode — no mock fallback.`, err);
    }
    throw err;
  }
}

export const api = {
  isLive: () => isBackendConfigured(),

  getLastAnalysis: (): BackendDetectedWorkflow | null => lastDetectedWorkflow,

  /**
   * Poll GET /api/watcher/status (+ optional /api/ingest/status merge).
   * Returns connectionMode "offline" when backend is configured but unreachable.
   */
  async getWatcherStatus(): Promise<WatcherStatus> {
    if (!isBackendConfigured()) {
      return mockWatcherStatus();
    }

    const base = getApiBaseUrl();
    try {
      const [watcherRes, ingestRes] = await Promise.all([
        fetch(`${base}${ENDPOINTS.watcherStatus}`),
        fetch(`${base}${ENDPOINTS.ingestStatus}`).catch(() => null),
      ]);

      if (!watcherRes.ok) {
        return { ...mockWatcherStatus(), connectionMode: "offline" };
      }

      const watcher = (await watcherRes.json()) as BackendWatcherStatus;
      let ingest: BackendIngestStatus | undefined;
      if (ingestRes?.ok) {
        ingest = (await ingestRes.json()) as BackendIngestStatus;
      }
      return mapWatcherStatus(watcher, ingest, "live");
    } catch {
      return { ...mockWatcherStatus(), connectionMode: "offline" };
    }
  },

  async getDemoData(): Promise<DemoDataset> {
    return fetchWithFallback<DemoDataset>(
      ENDPOINTS.demoData,
      async () => {
        await mockDelay();
        return clone(demoDataset);
      },
      {
        map: (raw) => mapDemoDataRaw(raw as BackendDemoDataRaw),
      }
    );
  },

  async analyseWorkflow(): Promise<OverviewSummary> {
    if (lastDetectedWorkflow) {
      return mapOverviewSummary(lastDetectedWorkflow);
    }
    return fetchWithFallback<OverviewSummary>(
      ENDPOINTS.analyseWorkflow,
      async () => {
        await delay(1400);
        return clone(overviewSummary);
      },
      {
        method: "POST",
        body: {},
        map: (raw) => {
          lastDetectedWorkflow = raw as BackendDetectedWorkflow;
          return mapOverviewSummary(lastDetectedWorkflow);
        },
      }
    );
  },

  async getOverview(): Promise<OverviewSummary> {
    if (lastDetectedWorkflow) {
      return mapOverviewSummary(lastDetectedWorkflow);
    }
    const current = await fetchLiveJson<BackendDetectedWorkflow>(
      ENDPOINTS.analysisCurrent
    );
    if (current) {
      lastDetectedWorkflow = current;
      return mapOverviewSummary(current);
    }
    if (!isBackendConfigured()) {
      return fetchWithFallback<OverviewSummary>(
        ENDPOINTS.analyseWorkflow,
        async () => {
          await mockDelay();
          return clone(overviewSummary);
        }
      );
    }
    return mapOverviewSummary({
      workflow_name: "Awaiting inbox scan",
      occurrence_count: 0,
      current_steps: [],
      bottlenecks: [],
      opportunity_score: 0,
      automation_proposal: [],
      assumptions: [
        "Run a scan from Setup to analyse your live inbox.",
      ],
      automation_rules: {
        internal_contacts_only: true,
        meeting_duration_minutes: 30,
        working_hours_start: "09:00",
        working_hours_end: "18:00",
        approval_required: true,
        max_slots_proposed: 3,
      },
      automation_available: false,
      workflow_category: "none",
      automation_summary: "No scan has run yet.",
      automatable_actions: [],
    });
  },

  async getOpportunities(): Promise<OptimisationOpportunity[]> {
    if (!isBackendConfigured()) {
      await mockDelay();
      return clone(opportunities);
    }
    if (!lastDetectedWorkflow) {
      const current = await fetchLiveJson<BackendDetectedWorkflow>(
        ENDPOINTS.analysisCurrent
      );
      if (current) lastDetectedWorkflow = current;
    }
    if (!lastDetectedWorkflow || lastDetectedWorkflow.automation_available === false) {
      return [];
    }
    return [mapDetectedWorkflowToOpportunity(lastDetectedWorkflow)];
  },

  async getOpportunity(id: string): Promise<OptimisationOpportunity | null> {
    const mock = opportunities.find((o) => o.id === id);
    const mockClone = mock ? clone(mock) : null;

    if (isBackendConfigured()) {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "")}${ENDPOINTS.opportunity(id)}`
        );
        if (res.ok) {
          const raw: unknown = await res.json();
          if (raw && typeof raw === "object" && "workflowName" in raw) {
            return raw as OptimisationOpportunity;
          }
          if (raw && typeof raw === "object" && "workflow_name" in raw) {
            const mapped = mapDetectedWorkflowToOpportunity(
              raw as BackendDetectedWorkflow,
              id
            );
            lastDetectedWorkflow = raw as BackendDetectedWorkflow;
            return mapped;
          }
        }
      } catch {
        /* fall through to mock + cache */
      }
    }

    if (lastDetectedWorkflow && id === "internal-meeting-scheduling") {
      return mapDetectedWorkflowToOpportunity(lastDetectedWorkflow, id);
    }

    return isBackendConfigured() ? null : mockClone;
  },

  async generateAutomation(id: string): Promise<WorkflowStep[]> {
    const mockOpp = opportunities.find((o) => o.id === id);
    const mockSteps = (): WorkflowStep[] =>
      clone(mockOpp?.proposedWorkflow ?? []);

    const steps = await fetchWithFallback<WorkflowStep[]>(
      ENDPOINTS.generateAutomation,
      mockSteps,
      {
        method: "POST",
        body: lastDetectedWorkflow ? { workflow: lastDetectedWorkflow } : {},
        map: (raw) =>
          (raw as BackendWorkflowStep[]).map((step) => ({
            id: step.step_id,
            title: step.name,
            actor: step.is_manual ? "user" : "sloth",
            tool: step.requires_approval
              ? "Approval"
              : step.is_manual
                ? "Manual"
                : "AI",
            durationMinutes: Math.round(step.avg_minutes),
            description: step.description,
          })),
      }
    );

    return steps.length > 0 ? steps : mockSteps();
  },

  async forecast(id: string, rules: AutomationRule): Promise<Forecast> {
    const mockOpp = opportunities.find((o) => o.id === id);

    const mockFallback = async (): Promise<Forecast> => {
      await mockDelay(500);
      if (!mockOpp) return {} as Forecast;
      const preview = previewSavings(rules, {
        runsPerMonth:
          mockOpp.frequency.unit === "month"
            ? mockOpp.frequency.value
            : mockOpp.frequency.value * 4,
        manualMinutesPerRun: mockOpp.evidence.manualMinutesPerRun,
      });
      const likely =
        preview.likelyHoursPerMonth || mockOpp.forecast.likelyHours;
      return {
        ...clone(mockOpp.forecast),
        likelyHours: likely,
        conservativeHours: Math.round(likely * 0.7 * 10) / 10,
        optimisticHours: Math.round(likely * 1.35 * 10) / 10,
        annualHours: Math.round(likely * 12),
      };
    };

    return fetchWithFallback<Forecast>(ENDPOINTS.forecast, mockFallback, {
      method: "POST",
      body: {
        rules: toBackendAutomationRule(rules),
        occurrence_count: lastDetectedWorkflow?.occurrence_count,
      },
      map: (raw) =>
        mapForecast(raw as BackendForecastMetrics, mockOpp?.forecast),
    });
  },

  async activateAutomation(
    id: string,
    rules: AutomationRule
  ): Promise<ActivateAutomationResult> {
    const mockOpp = opportunities.find((o) => o.id === id);

    return fetchWithFallback<ActivateAutomationResult>(
      ENDPOINTS.activateAutomation,
      async () => {
        await mockDelay(700);
        return {
          automation: {
            id: `auto-${id}`,
            opportunityId: id,
            name: `${mockOpp?.workflowName ?? "Workflow"} Assistant`,
            status: "active",
            approvalMode: rules.approvalMode,
            activatedAt: new Date().toISOString(),
            runsCompleted: 0,
            effectivenessScore: 0,
            estimatedMinutesSaved: 0,
            lastActivity: new Date().toISOString(),
            rules,
          },
          preview: {
            triggerLabel: "New scheduling email detected",
            slotCount: rules.maxSuggestedSlots,
          },
        };
      },
      {
        method: "POST",
        body: {
          opportunity_id: id,
          rules: toBackendAutomationRule(rules),
        },
        map: (raw) =>
          mapActivationResponse(
            raw as BackendActivationResponse,
            id,
            rules,
            mockOpp?.workflowName ?? lastDetectedWorkflow?.workflow_name
          ),
      }
    );
  },

  async getActiveAutomations(): Promise<ActiveAutomation[]> {
    if (isBackendConfigured()) {
      return [];
    }
    await mockDelay();
    return clone(activeAutomations);
  },

  async pauseAutomation(id: string): Promise<{ ok: true }> {
    await mockDelay();
    void id;
    return { ok: true };
  },

  async getEffectiveness(_id?: string): Promise<EffectivenessMetrics | null> {
    void _id;
    if (isBackendConfigured()) {
      return null;
    }
    return fetchWithFallback<EffectivenessMetrics>(
      ENDPOINTS.effectiveness,
      async () => {
        await mockDelay();
        return clone(effectivenessMetrics);
      },
      {
        map: (raw) => mapEffectiveness(raw as BackendEffectivenessMetrics),
      }
    );
  },

  async runInboxAnalysis(
    onTick?: (status: WatcherStatus | null, elapsedSec: number) => void
  ): Promise<BootstrapResult> {
    if (!isBackendConfigured()) {
      return api.bootstrapPrototype();
    }

    const started = Date.now();
    const pollStatus = async (): Promise<BackendWatcherStatus | null> => {
      const raw = await fetchLiveJson<BackendWatcherStatus>(ENDPOINTS.watcherStatus);
      onTick?.(
        raw ? mapWatcherStatus(raw, undefined, "live") : null,
        Math.floor((Date.now() - started) / 1000)
      );
      return raw;
    };

    let status = await pollStatus();
    if (status?.initial_scan_done && !status.scan_in_progress) {
      const cached = await loadCachedBootstrap();
      if (cached) return cached;
    }

    if (!status?.scan_in_progress) {
      await fetchLiveJson(`${ENDPOINTS.watcherScan}?background=true`, {
        method: "POST",
      });
    }

    const deadline = started + 120_000;
    while (Date.now() < deadline) {
      await delay(2000);
      status = await pollStatus();
      if (
        status?.initial_scan_done &&
        !status.scan_in_progress &&
        status.last_scan_at
      ) {
        const cached = await loadCachedBootstrap();
        if (cached) return cached;
      }
    }

    const cached = await loadCachedBootstrap();
    if (cached) return cached;

    throw new Error(
      "Inbox scan is taking longer than expected. Continue to the dashboard — results may appear in the bell shortly."
    );
  },

  async bootstrapPrototype(): Promise<BootstrapResult> {
    if (!isBackendConfigured()) {
      return fetchWithFallback(
        ENDPOINTS.prototypeBootstrap,
        async () => {
          await mockDelay(800);
          return {
            workflowName: overviewSummary.workflowName,
            opportunityScore: overviewSummary.opportunityScore,
            notifications: clone(notifications),
            automationAvailable: true,
            automationSummary: overviewSummary.explanation,
          };
        },
        {
          method: "POST",
          body: {},
          map: (raw) => mapBootstrapResponse(raw as BackendPrototypeBootstrapResponse),
        }
      );
    }

    const body = await fetchLiveOrMock<BootstrapResult>(
      `${ENDPOINTS.prototypeBootstrap}?force=false`,
      async () => ({
        workflowName: "",
        opportunityScore: 0,
        notifications: [],
        automationAvailable: false,
        automationSummary: "",
      }),
      {
        method: "POST",
        body: {},
        map: (raw) => mapBootstrapResponse(raw as BackendPrototypeBootstrapResponse),
      }
    );
    return body;
  },

  async getRecentInbox(limit = 8): Promise<RecentInboxResult> {
    if (!isBackendConfigured()) {
      await mockDelay();
      return { dataSource: "demo", count: 0, emails: [] };
    }
    const raw = await fetchLiveJson<{
      data_source?: string;
      count?: number;
      emails?: Array<{
        subject: string;
        sender: string;
        timestamp: string;
        preview?: string | null;
      }>;
    }>(`${ENDPOINTS.recentInbox}?limit=${limit}`);
    if (!raw) {
      return { dataSource: "unknown", count: 0, emails: [] };
    }
    return {
      dataSource: (raw.data_source ?? "unknown") as RecentInboxResult["dataSource"],
      count: raw.count ?? 0,
      emails: (raw.emails ?? []).map((e) => ({
        subject: e.subject,
        sender: e.sender,
        timestamp: e.timestamp,
        preview: e.preview ?? null,
      })),
    };
  },

  async getNotifications(): Promise<SlothNotification[]> {
    if (!isBackendConfigured()) {
      return fetchWithFallback<SlothNotification[]>(
        ENDPOINTS.notifications,
        async () => {
          await mockDelay();
          return clone(notifications);
        }
      );
    }
    const raw = await fetchLiveJson<BackendPrototypeBootstrapResponse["notifications"]>(
      ENDPOINTS.notifications
    );
    return raw ? raw.map(mapNotificationItem) : [];
  },

  async automateNotification(
    notificationId: string,
    opportunityId: string,
    rules: AutomationRule
  ): Promise<ActivateAutomationResult> {
    const mockOpp = opportunities.find((o) => o.id === opportunityId);

    return fetchWithFallback<ActivateAutomationResult>(
      ENDPOINTS.automateNotification(notificationId),
      async () => {
        await mockDelay(900);
        return {
          automation: {
            id: `auto-${opportunityId}`,
            opportunityId,
            name: `${mockOpp?.workflowName ?? "Workflow"} Assistant`,
            status: "active",
            approvalMode: rules.approvalMode,
            activatedAt: new Date().toISOString(),
            runsCompleted: 1,
            effectivenessScore: 0,
            estimatedMinutesSaved: 12,
            lastActivity: new Date().toISOString(),
            rules,
          },
          preview: {
            triggerLabel: "New scheduling email detected",
            draftReply:
              "Hi,\n\nThanks for the note. Here are a few times that work:\n- Tue 10:00\n\nBest,",
            proposedSlots: ["Tue 10:00 → 10:30"],
            slotCount: 1,
            tentativeEventTitle: "Quick sync next week?",
          },
        };
      },
      {
        method: "POST",
        body: {},
        map: (raw) =>
          mapActivationResponse(
            (raw as BackendAutomateNotificationResponse).activation,
            opportunityId,
            rules,
            mockOpp?.workflowName ?? lastDetectedWorkflow?.workflow_name
          ),
      }
    );
  },

  getAssistantInsight(context: AssistantContext): AssistantInsight | undefined {
    if (isBackendConfigured()) {
      const wf = lastDetectedWorkflow;
      const base = {
        id: "live-assistant",
        context,
        title: "SLOTH Assistant",
        suggestedActions: [] as string[],
      };

      if (context === "overview" || context === "landing") {
        if (wf?.automation_available === false) {
          return {
            ...base,
            message:
              wf.automation_summary ||
              "I read your inbox but did not find a workflow safe enough to automate.",
            suggestedActions: ["Scan again"],
          };
        }
        if (wf?.automation_available) {
          return {
            ...base,
            message:
              wf.automation_summary ||
              `I found "${wf.workflow_name}" in your email (${Math.round(wf.opportunity_score)}/100).`,
            suggestedActions: (wf.automatable_actions ?? []).slice(0, 3),
          };
        }
        return {
          ...base,
          message:
            "Scan your inbox from Setup. I'll tell you honestly what can and cannot be automated.",
          suggestedActions: ["Scan inbox"],
        };
      }

      if (context === "opportunity" || context === "workflow") {
        if (wf) {
          return {
            ...base,
            message:
              wf.automation_summary ||
              `This analysis is from your real inbox: "${wf.workflow_name}".`,
            suggestedActions: (wf.automatable_actions ?? []).slice(0, 2),
          };
        }
        return {
          ...base,
          message: "No workflow analysis yet — run an inbox scan first.",
        };
      }

      if (context === "effectiveness" || context === "automation") {
        return {
          ...base,
          message:
            "Metrics appear after you activate an automation from a notification. Nothing runs without your approval.",
        };
      }

      if (context === "setup") {
        return {
          ...base,
          message:
            "I'll read recent email via IMAP, detect repeatable work, and say clearly if automation isn't available.",
        };
      }

      return {
        ...base,
        message: "Live mode — results come from your inbox, not demo data.",
      };
    }

    return assistantInsights.find((i) => i.context === context);
  },
};

export type SlothApi = typeof api;
