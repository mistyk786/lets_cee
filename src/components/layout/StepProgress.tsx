import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProcessStep = "detect" | "design" | "optimise" | "measure";

const STEPS: { key: ProcessStep; label: string }[] = [
  { key: "detect", label: "Detect" },
  { key: "design", label: "Design" },
  { key: "optimise", label: "Optimise" },
  { key: "measure", label: "Measure" },
];

/** The Detect → Design → Optimise → Measure process indicator. */
export function StepProgress({
  current,
  className,
}: {
  current: ProcessStep;
  className?: string;
}) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <nav
      aria-label="Workflow progress"
      className={cn("flex items-center", className)}
    >
      {STEPS.map((step, i) => {
        const state =
          i < currentIndex ? "done" : i === currentIndex ? "active" : "todo";
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  state === "done" && "bg-moss-600 text-white",
                  state === "active" &&
                    "bg-moss-100 text-moss-700 ring-2 ring-moss-500",
                  state === "todo" && "bg-ink-100 text-ink-400"
                )}
              >
                {state === "done" ? <Check size={14} /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-sm font-medium",
                  state === "todo" ? "text-ink-400" : "text-ink-800"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className={cn(
                  "mx-3 h-px w-8 sm:w-12",
                  i < currentIndex ? "bg-moss-400" : "bg-ink-200"
                )}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
