import type { BackendDetectedWorkflow } from "./backend/types";

const WORKFLOW_KEY = "sloth:last-workflow";

export function workflowIdFromName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "workflow"
  );
}

export function loadStoredWorkflow(): BackendDetectedWorkflow | null {
  try {
    const raw = sessionStorage.getItem(WORKFLOW_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BackendDetectedWorkflow;
  } catch {
    return null;
  }
}

export function saveStoredWorkflow(workflow: BackendDetectedWorkflow): void {
  try {
    sessionStorage.setItem(WORKFLOW_KEY, JSON.stringify(workflow));
  } catch {
    /* quota / private mode */
  }
}

export function clearStoredWorkflow(): void {
  try {
    sessionStorage.removeItem(WORKFLOW_KEY);
  } catch {
    /* ignore */
  }
}
