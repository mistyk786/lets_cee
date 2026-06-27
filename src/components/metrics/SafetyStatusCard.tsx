import { ShieldCheck, ShieldAlert } from "lucide-react";
import type { SafetyIncident } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SafetyStatusCard({
  status,
  incidents,
  approvalEnabled = true,
}: {
  status: "healthy" | "needs_review";
  incidents: SafetyIncident[];
  approvalEnabled?: boolean;
}) {
  const healthy = status === "healthy";
  return (
    <div
      className={cn(
        "rounded-2xl border p-5",
        healthy
          ? "border-moss-200 bg-moss-50/60"
          : "border-amber-300 bg-amber-50"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            healthy ? "bg-moss-600 text-white" : "bg-amber-500 text-white"
          )}
        >
          {healthy ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-900">
            {healthy
              ? "Safety status: No major incidents"
              : "Safety status: Needs review"}
          </p>
          <p className="text-xs text-ink-500">
            {approvalEnabled
              ? "Human approval remains enabled"
              : "Approval mode is off"}
          </p>
        </div>
      </div>

      {incidents.length > 0 && (
        <ul className="mt-4 space-y-2">
          {incidents.map((incident) => (
            <li
              key={incident.id}
              className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-ink-700"
            >
              <span className="font-medium text-amber-700">
                {incident.severity === "critical" ? "Critical" : "Warning"}:
              </span>{" "}
              {incident.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
