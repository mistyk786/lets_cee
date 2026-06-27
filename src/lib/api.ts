/**
 * SLOTH frontend API adapter.
 *
 * When VITE_API_BASE_URL is set, all data comes from the backend (live IMAP inbox).
 * Mock data is only used when no backend URL is configured (local UI dev).
 */

import type {
  BackendActivationResponse,
  BackendDemoDataRaw,
  BackendDetectedWorkflow,
  BackendEffectivenessMetrics,
  BackendForecastMetrics,
  BackendIngestStatus,
  BackendWatcherStatus,
  BackendWorkflowStep,
} from "./backend/types";
import { fetchLive, isBackendConfigured } from "./http";
import {
  mapActivationResponse,
  mapDemoDataRaw,
  mapDetectedWorkflowToOpportunity,
  mapEffectiveness,
  mapForecast,
  mapOverviewSummary,
  mapWatcherStatus,
  offlineWatcherStatus,
  toBackendAutomationRule,
} from "./mappers";
import {
  clearStoredWorkflow,
  loadStoredWorkflow,
  saveStoredWorkflow,
  workflowIdFromName,
} from "./workflowSession";
import {
  activeAutomations,
  assistantInsights,
  demoDataset,
  effectivenessMetrics,
  notifications,
  overviewSummary,
} from "./mockData";
import { delay } from "./utils";
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
  notifications: "/api/notifications",
} as const;

export const WATCHER_POLL_MS = Number(
  import.meta.env.VITE_WATCHER_POLL_MS ?? 15_000
);

function initWorkflowCache(): BackendDetectedWorkflow | null {
  if (isBackendConfigured()) {
    // Drop any demo workflow cached before live mode was enabled.
    clearStoredWorkflow();
    return null;
  }
  return loadStoredWorkflow();
}

let lastDetectedWorkflow: BackendDetectedWorkflow | null = initWorkflowCache();

function cacheWorkflow(workflow: BackendDetectedWorkflow): void {
  lastDetectedWorkflow = workflow;
  saveStoredWorkflow(workflow);
}

function workflowManualMinutes(workflow: BackendDetectedWorkflow): number {
  const manual = workflow.current_steps.filter((s) => s.is_manual);
  if (manual.length === 0) return 12;
  return manual.reduce((sum, s) => sum + s.avg_minutes, 0) / manual.length;
}

function mapBackendSteps(steps: BackendWorkflowStep[]): WorkflowStep[] {
  return steps.map((step) => ({
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
  }));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export const api = {
  isLive: () => isBackendConfigured(),

  getLastAnalysis: (): BackendDetectedWorkflow | null => lastDetectedWorkflow,

  getPrimaryOpportunityId(): string {
    if (lastDetectedWorkflow) {
      return workflowIdFromName(lastDetectedWorkflow.workflow_name);
    }
    if (isBackendConfigured()) {
      throw new Error("No workflow analysed yet. Run inbox scan first.");
    }
    return "internal-meeting-scheduling";
  },

  async getWatcherStatus(): Promise<WatcherStatus> {
    if (!isBackendConfigured()) {
      return offlineWatcherStatus("mock");
    }
    try {
      const [watcher, ingest] = await Promise.all([
        fetchLive<BackendWatcherStatus>(ENDPOINTS.watcherStatus),
        fetchLive<BackendIngestStatus>(ENDPOINTS.ingestStatus).catch(
          () => undefined
        ),
      ]);
      return mapWatcherStatus(watcher, ingest, "live");
    } catch {
      return offlineWatcherStatus("offline");
    }
  },

  async getDemoData(): Promise<DemoDataset> {
    if (isBackendConfigured()) {
      return fetchLive<DemoDataset>(ENDPOINTS.demoData, {
        map: (raw) => mapDemoDataRaw(raw as BackendDemoDataRaw),
      });
    }
    await delay(350);
    return clone(demoDataset);
  },

  async analyseWorkflow(): Promise<OverviewSummary> {
    if (isBackendConfigured()) {
      const summary = await fetchLive<OverviewSummary>(
        ENDPOINTS.analyseWorkflow,
        {
          method: "POST",
          body: { demo_mode: false, prefer_live: true },
          map: (raw) => {
            cacheWorkflow(raw as BackendDetectedWorkflow);
            return mapOverviewSummary(lastDetectedWorkflow!);
          },
        }
      );
      return summary;
    }
    await delay(1400);
    return clone(overviewSummary);
  },

  async getOverview(): Promise<OverviewSummary> {
    if (lastDetectedWorkflow) {
      return mapOverviewSummary(lastDetectedWorkflow);
    }
    if (isBackendConfigured()) {
      return this.analyseWorkflow();
    }
    await delay(350);
    return clone(overviewSummary);
  },

  async getOpportunities(): Promise<OptimisationOpportunity[]> {
    if (isBackendConfigured()) {
      const workflows = await fetchLive<BackendDetectedWorkflow[]>(
        ENDPOINTS.opportunities
      );
      if (workflows.length === 0) return [];
      cacheWorkflow(workflows[0]);
      return workflows.map((wf) => mapDetectedWorkflowToOpportunity(wf));
    }
    if (lastDetectedWorkflow) {
      return [mapDetectedWorkflowToOpportunity(lastDetectedWorkflow)];
    }
    await delay(350);
    return [];
  },

  async getOpportunity(id: string): Promise<OptimisationOpportunity | null> {
    if (isBackendConfigured()) {
      const workflow = await fetchLive<BackendDetectedWorkflow>(
        ENDPOINTS.opportunity(id)
      );
      cacheWorkflow(workflow);
      const mapped = mapDetectedWorkflowToOpportunity(
        workflow,
        workflowIdFromName(workflow.workflow_name)
      );
      const steps = await this.generateAutomation(mapped.id);
      if (steps.length > 0) mapped.proposedWorkflow = steps;
      return mapped;
    }

    if (lastDetectedWorkflow) {
      const liveId = workflowIdFromName(lastDetectedWorkflow.workflow_name);
      if (id === liveId) {
        const mapped = mapDetectedWorkflowToOpportunity(
          lastDetectedWorkflow,
          liveId
        );
        const steps = await this.generateAutomation(liveId);
        if (steps.length > 0) mapped.proposedWorkflow = steps;
        return mapped;
      }
    }
    return null;
  },

  async generateAutomation(id: string): Promise<WorkflowStep[]> {
    void id;
    if (isBackendConfigured()) {
      const steps = await fetchLive<WorkflowStep[]>(
        ENDPOINTS.generateAutomation,
        {
          method: "POST",
          body: lastDetectedWorkflow
            ? { workflow: lastDetectedWorkflow }
            : {},
          map: (raw) => mapBackendSteps(raw as BackendWorkflowStep[]),
        }
      );
      return steps;
    }
    return [];
  },

  async forecast(id: string, rules: AutomationRule): Promise<Forecast> {
    void id;
    if (!lastDetectedWorkflow && !isBackendConfigured()) {
      return {} as Forecast;
    }

    if (isBackendConfigured()) {
      return fetchLive<Forecast>(ENDPOINTS.forecast, {
        method: "POST",
        body: {
          rules: toBackendAutomationRule(rules),
          occurrence_count: lastDetectedWorkflow?.occurrence_count,
          manual_minutes_per_run: lastDetectedWorkflow
            ? Math.round(workflowManualMinutes(lastDetectedWorkflow))
            : undefined,
          review_minutes_per_run: 3,
          exception_minutes: 12,
        },
        map: (raw) => mapForecast(raw as BackendForecastMetrics),
      });
    }

    return mapForecast(
      {
        eligible_runs: lastDetectedWorkflow?.occurrence_count ?? 0,
        manual_minutes_per_run: lastDetectedWorkflow
          ? workflowManualMinutes(lastDetectedWorkflow)
          : 0,
        review_minutes_per_run: 3,
        exception_minutes: 12,
        conservative_hours_saved: 0,
        likely_hours_saved: 0,
        optimistic_hours_saved: 0,
      },
      undefined
    );
  },

  async activateAutomation(
    id: string,
    rules: AutomationRule
  ): Promise<ActivateAutomationResult> {
    if (isBackendConfigured()) {
      return fetchLive<ActivateAutomationResult>(ENDPOINTS.activateAutomation, {
        method: "POST",
        body: { rules: toBackendAutomationRule(rules) },
        map: (raw) =>
          mapActivationResponse(
            raw as BackendActivationResponse,
            id,
            rules,
            lastDetectedWorkflow?.workflow_name
          ),
      });
    }
    await delay(700);
    return {
      automation: {
        id: `auto-${id}`,
        opportunityId: id,
        name: `${lastDetectedWorkflow?.workflow_name ?? "Workflow"} Assistant`,
        status: "active",
        approvalMode: rules.approvalMode,
        activatedAt: new Date().toISOString(),
        runsCompleted: 0,
        effectivenessScore: 0,
        estimatedMinutesSaved: 0,
        lastActivity: new Date().toISOString(),
        rules,
      },
    };
  },

  async getActiveAutomations(): Promise<ActiveAutomation[]> {
    if (isBackendConfigured()) return [];
    await delay(350);
    return clone(activeAutomations);
  },

  async pauseAutomation(id: string): Promise<{ ok: true }> {
    void id;
    return { ok: true };
  },

  async getEffectiveness(_id?: string): Promise<EffectivenessMetrics> {
    void _id;
    if (isBackendConfigured()) {
      return fetchLive<EffectivenessMetrics>(ENDPOINTS.effectiveness, {
        map: (raw) => mapEffectiveness(raw as BackendEffectivenessMetrics),
      });
    }
    await delay(350);
    return clone(effectivenessMetrics);
  },

  async getNotifications(): Promise<SlothNotification[]> {
    if (isBackendConfigured()) return [];
    await delay(350);
    return clone(notifications);
  },

  getAssistantInsight(context: AssistantContext): AssistantInsight | undefined {
    if (isBackendConfigured()) return undefined;
    return assistantInsights.find((i) => i.context === context);
  },
};

export type SlothApi = typeof api;
