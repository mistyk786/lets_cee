import { Fragment } from "react";
import { ChevronDown } from "lucide-react";
import type { NodeKind, WorkflowStep } from "@/lib/types";
import { WorkflowNode, NODE_KIND_META } from "./WorkflowNode";

/**
 * Clean, reusable node-and-arrow flow diagram. Renders a vertical sequence of
 * workflow steps with connectors. Used for both the current (manual) workflow
 * and the proposed (future-state) automation, distinguished by `variant`.
 */
export function WorkflowDiagram({
  steps,
  variant = "current",
}: {
  steps: WorkflowStep[];
  variant?: "current" | "proposed";
}) {
  return (
    <div className="flex flex-col items-stretch">
      {steps.map((step, i) => (
        <Fragment key={step.id}>
          <WorkflowNode step={step} variant={variant} index={i} />
          {i < steps.length - 1 && (
            <div className="flex flex-col items-center py-1">
              <span className="h-3 w-px bg-ink-200" />
              <ChevronDown size={14} className="text-ink-300" />
              <span className="h-3 w-px bg-ink-200" />
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}

/** Legend explaining the colour-coded node types (proposed automation). */
export function WorkflowLegend({ kinds }: { kinds: NodeKind[] }) {
  const unique = Array.from(new Set(kinds));
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {unique.map((kind) => {
        const meta = NODE_KIND_META[kind];
        return (
          <div key={kind} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: meta.color }}
            />
            <span className="font-mono text-[10px] uppercase tracking-wide text-ink-400">
              {meta.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
