/**
 * SLOTH frontend API adapter.
 *
 * This is the single seam between the UI and data. Today every method returns
 * typed mock data after a small simulated latency. To go live, a backend dev
 * replaces each function body with a real `fetch(...)` to the matching endpoint
 * documented in `ENDPOINTS` — no component changes required.
 *
 * Future endpoints (see README):
 *   GET  /api/demo-data
 *   POST /api/analyse-workflow
 *   POST /api/generate-automation
 *   POST /api/forecast
 *   POST /api/activate-automation
 *   GET  /api/effectiveness
 *   GET  /api/opportunities
 *   GET  /api/opportunities/{id}
 *   POST /api/opportunities/{id}/review
 *   POST /api/opportunities/{id}/configure
 *   POST /api/opportunities/{id}/activate
 *   POST /api/opportunities/{id}/pause
 *   GET  /api/opportunities/{id}/metrics
 *   GET  /api/notifications
 */

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
} from "./types";

export const ENDPOINTS = {
  demoData: "/api/demo-data",
  analyseWorkflow: "/api/analyse-workflow",
  generateAutomation: "/api/generate-automation",
  forecast: "/api/forecast",
  activateAutomation: "/api/activate-automation",
  effectiveness: "/api/effectiveness",
  opportunities: "/api/opportunities",
  opportunity: (id: string) => `/api/opportunities/${id}`,
  reviewOpportunity: (id: string) => `/api/opportunities/${id}/review`,
  configureOpportunity: (id: string) => `/api/opportunities/${id}/configure`,
  activateOpportunity: (id: string) => `/api/opportunities/${id}/activate`,
  pauseOpportunity: (id: string) => `/api/opportunities/${id}/pause`,
  opportunityMetrics: (id: string) => `/api/opportunities/${id}/metrics`,
  notifications: "/api/notifications",
} as const;

// Small simulated latency so loading states are demonstrable.
const LATENCY = 350;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export const api = {
  async getDemoData(): Promise<DemoDataset> {
    await delay(LATENCY);
    return clone(demoDataset);
  },

  /** Simulates the longer "mapping your workflow" analysis step. */
  async analyseWorkflow(): Promise<OverviewSummary> {
    await delay(1400);
    return clone(overviewSummary);
  },

  async getOverview(): Promise<OverviewSummary> {
    await delay(LATENCY);
    return clone(overviewSummary);
  },

  async getOpportunities(): Promise<OptimisationOpportunity[]> {
    await delay(LATENCY);
    return clone(opportunities);
  },

  async getOpportunity(id: string): Promise<OptimisationOpportunity | null> {
    await delay(LATENCY);
    const found = opportunities.find((o) => o.id === id);
    return found ? clone(found) : null;
  },

  async generateAutomation(
    id: string,
    rules?: Partial<AutomationRule>
  ): Promise<AutomationRule> {
    await delay(LATENCY);
    const opp = opportunities.find((o) => o.id === id);
    const base = opp?.proposedRules;
    if (!base) throw new Error(`Unknown opportunity: ${id}`);
    return { ...clone(base), ...rules };
  },

  async forecast(id: string, rules: AutomationRule): Promise<Forecast> {
    await delay(500);
    const opp = opportunities.find((o) => o.id === id);
    if (!opp) throw new Error(`Unknown opportunity: ${id}`);
    const preview = previewSavings(rules, {
      runsPerMonth:
        opp.frequency.unit === "month"
          ? opp.frequency.value
          : opp.frequency.value * 4,
      manualMinutesPerRun: opp.evidence.manualMinutesPerRun,
    });
    // Blend the base forecast with the live preview for responsiveness.
    const likely = preview.likelyHoursPerMonth || opp.forecast.likelyHours;
    return {
      ...clone(opp.forecast),
      likelyHours: likely,
      conservativeHours: Math.round(likely * 0.7 * 10) / 10,
      optimisticHours: Math.round(likely * 1.35 * 10) / 10,
      annualHours: Math.round(likely * 12),
    };
  },

  async activateAutomation(
    id: string,
    rules: AutomationRule
  ): Promise<ActiveAutomation> {
    await delay(700);
    const opp = opportunities.find((o) => o.id === id);
    return {
      id: `auto-${id}`,
      opportunityId: id,
      name: `${opp?.workflowName ?? "Workflow"} Assistant`,
      status: "active",
      approvalMode: rules.approvalMode,
      activatedAt: new Date().toISOString(),
      runsCompleted: 0,
      effectivenessScore: 0,
      estimatedMinutesSaved: 0,
      lastActivity: new Date().toISOString(),
      rules,
    };
  },

  async getActiveAutomations(): Promise<ActiveAutomation[]> {
    await delay(LATENCY);
    return clone(activeAutomations);
  },

  async pauseAutomation(id: string): Promise<{ ok: true }> {
    await delay(LATENCY);
    void id;
    return { ok: true };
  },

  async getEffectiveness(_id?: string): Promise<EffectivenessMetrics> {
    await delay(LATENCY);
    void _id;
    return clone(effectivenessMetrics);
  },

  async getNotifications(): Promise<SlothNotification[]> {
    await delay(LATENCY);
    return clone(notifications);
  },

  getAssistantInsight(context: AssistantContext): AssistantInsight | undefined {
    return assistantInsights.find((i) => i.context === context);
  },
};

export type SlothApi = typeof api;
