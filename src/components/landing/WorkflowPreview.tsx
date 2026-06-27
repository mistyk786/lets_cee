import { Search, PenTool, Settings2, LineChart, ArrowRight } from "lucide-react";

const STAGES = [
  { label: "Detect", icon: Search, color: "#6d5bd0" },
  { label: "Design", icon: PenTool, color: "#2f7fae" },
  { label: "Optimise", icon: Settings2, color: "#3d8c62" },
  { label: "Measure", icon: LineChart, color: "#b9863f" },
];

/** The Detect → Design → Optimise → Measure illustration used on the landing page. */
export function WorkflowPreview() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
      {STAGES.map((stage, i) => (
        <div key={stage.label} className="flex items-center gap-2 sm:gap-3">
          <div className="flex flex-col items-center gap-2">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-soft"
              style={{ backgroundColor: `${stage.color}14`, color: stage.color }}
            >
              <stage.icon size={24} />
            </div>
            <span className="text-sm font-semibold text-ink-700">
              {stage.label}
            </span>
          </div>
          {i < STAGES.length - 1 && (
            <ArrowRight size={18} className="text-ink-300" />
          )}
        </div>
      ))}
    </div>
  );
}
