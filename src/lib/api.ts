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
  mergeOpportunityWithMock,
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
  ingestStatus: "/api/ingest/status",
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
    return fetchWithFallback<OverviewSummary>(
      ENDPOINTS.analyseWorkflow,
      async () => {
        await mockDelay();
        return clone(overviewSummary);
      }
    );
  },

  async getOpportunities(): Promise<OptimisationOpportunity[]> {
    await mockDelay();
    return clone(opportunities);
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
            return mockClone
              ? mergeOpportunityWithMock(mapped, mockClone)
              : mapped;
          }
        }
      } catch {
        /* fall through to mock + cache */
      }
    }

    if (lastDetectedWorkflow && id === "internal-meeting-scheduling") {
      const mapped = mapDetectedWorkflowToOpportunity(
        lastDetectedWorkflow,
        id
      );
      return mockClone ? mergeOpportunityWithMock(mapped, mockClone) : mapped;
    }

    return mockClone;
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
    await mockDelay();
    return clone(activeAutomations);
  },

  async pauseAutomation(id: string): Promise<{ ok: true }> {
    await mockDelay();
    void id;
    return { ok: true };
  },

  async getEffectiveness(_id?: string): Promise<EffectivenessMetrics> {
    void _id;
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

  async bootstrapPrototype(): Promise<{
    workflowName: string;
    opportunityScore: number;
    notifications: SlothNotification[];
  }> {
    return fetchWithFallback(
      ENDPOINTS.prototypeBootstrap,
      async () => {
        await mockDelay(800);
        return {
          workflowName: overviewSummary.workflowName,
          opportunityScore: overviewSummary.opportunityScore,
          notifications: clone(notifications),
        };
      },
      {
        method: "POST",
        body: {},
        map: (raw) => {
          const body = raw as BackendPrototypeBootstrapResponse;
          return {
            workflowName: body.workflow_name,
            opportunityScore: body.opportunity_score,
            notifications: body.notifications.map(mapNotificationItem),
          };
        },
      }
    );
  },

  async getNotifications(): Promise<SlothNotification[]> {
    return fetchWithFallback<SlothNotification[]>(
      ENDPOINTS.notifications,
      async () => {
        await mockDelay();
        return clone(notifications);
      },
      {
        map: (raw) =>
          (raw as BackendPrototypeBootstrapResponse["notifications"]).map(
            mapNotificationItem
          ),
      }
    );
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
    return assistantInsights.find((i) => i.context === context);
  },
};

export type SlothApi = typeof api;
