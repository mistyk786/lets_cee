import {
  Mail,
  Calendar,
  Sparkles,
  UserCheck,
  Play,
  BarChart3,
  Hand,
  type LucideIcon,
} from "lucide-react";
import type { NodeKind, WorkflowStep } from "@/lib/types";
import { cn } from "@/lib/utils";

export const NODE_KIND_META: Record<
  NodeKind,
  { label: string; color: string; bg: string; border: string; icon: LucideIcon }
> = {
  trigger: {
    label: "Trigger",
    color: "#646e80",
    bg: "bg-ink-50",
    border: "border-ink-200",
    icon: Play,
  },
  manual: {
    label: "Manual work",
    color: "#c2703a",
    bg: "bg-manual/5",
    border: "border-manual/30",
    icon: Hand,
  },
  ai: {
    label: "AI-supported",
    color: "#6d5bd0",
    bg: "bg-ai/5",
    border: "border-ai/30",
    icon: Sparkles,
  },
  calendar: {
    label: "Calendar action",
    color: "#2f7fae",
    bg: "bg-calendar/5",
    border: "border-calendar/30",
    icon: Calendar,
  },
  approval: {
    label: "Human approval",
    color: "#b9863f",
    bg: "bg-approval/10",
    border: "border-approval/40",
    icon: UserCheck,
  },
  email: {
    label: "Email action",
    color: "#3d8c62",
    bg: "bg-email/5",
    border: "border-email/30",
    icon: Mail,
  },
  measure: {
    label: "Measurement",
    color: "#7a8aa0",
    bg: "bg-measure/5",
    border: "border-measure/30",
    icon: BarChart3,
  },
};

const FRICTION_META = {
  high: { label: "High friction", className: "bg-red-100 text-red-700" },
  medium: { label: "Some friction", className: "bg-amber-100 text-amber-700" },
  low: { label: "", className: "" },
};

export function WorkflowNode({
  step,
  variant = "current",
  index,
}: {
  step: WorkflowStep;
  variant?: "current" | "proposed";
  index: number;
}) {
  const kind = step.kind ?? "manual";
  const meta = NODE_KIND_META[kind];
  const Icon = meta.icon;
  const friction = step.frictionLevel ?? "low";
  const showFriction = variant === "current" && friction !== "low";
  const stepNum = String(index + 1).padStart(2, "0");

  return (
    <div
      className={cn(
        "card group relative w-full overflow-hidden p-4 transition-all duration-200 ease-smooth hover:-translate-y-0.5 hover:shadow-lift",
        meta.border,
        showFriction && "ring-1 ring-red-200/80"
      )}
    >
      {/* Left accent rail */}
      <span
        className="absolute bottom-3 left-0 top-3 w-0.5 rounded-full"
        style={{ backgroundColor: meta.color }}
      />

      <div className="flex items-start gap-3 pl-2">
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <span className="font-mono text-[10px] tracking-label text-ink-300">
            {stepNum}
          </span>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-soft"
            style={{ backgroundColor: meta.color }}
          >
            <Icon size={16} />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-display text-[15px] font-medium leading-snug tracking-tight text-ink-900">
              {step.title}
            </p>
            {step.durationMinutes != null && (
              <span className="shrink-0 rounded-md bg-ink-100/90 px-1.5 py-0.5 font-mono text-[10px] font-medium tnum text-ink-600">
                ~{step.durationMinutes}m
              </span>
            )}
          </div>
          {step.description && (
            <p className="mt-1 text-xs leading-relaxed text-ink-500">
              {step.description}
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span
              className="rounded-md px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide"
              style={{ color: meta.color, backgroundColor: `${meta.color}14` }}
            >
              {variant === "proposed" ? meta.label : actorLabel(step.actor)}
            </span>
            <span className="rounded-md bg-ink-100/80 px-1.5 py-0.5 font-mono text-[10px] text-ink-500">
              {step.tool}
            </span>
            {showFriction && (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide",
                  FRICTION_META[friction].className
                )}
              >
                {FRICTION_META[friction].label}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function actorLabel(actor: string): string {
  switch (actor) {
    case "user":
      return "You";
    case "recipient":
      return "Recipient";
    case "sloth":
      return "SLOTH";
    default:
      return actor;
  }
}
