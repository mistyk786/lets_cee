import { useState } from "react";
import {
  ChevronDown,
  Clock,
  CalendarCheck,
  MailMinus,
  Timer,
  Info,
} from "lucide-react";
import type { Forecast } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * "Expected Impact" forecast. Presents estimates explicitly as assumptions and
 * exposes the calculation behind them.
 */
export function ForecastPanel({ forecast }: { forecast: Forecast }) {
  const [showMath, setShowMath] = useState(false);

  const scenarios = [
    { label: "Conservative", hours: forecast.conservativeHours, tone: "ink" },
    { label: "Likely", hours: forecast.likelyHours, tone: "moss" },
    { label: "Optimistic", hours: forecast.optimisticHours, tone: "info" },
  ] as const;

  const maxHours = forecast.optimisticHours || 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 rounded-xl bg-ink-50 px-3 py-2 text-xs text-ink-500">
        <Info size={14} className="shrink-0 text-ink-400" />
        These are estimates based on observed workflow frequency and your
        editable assumptions — not guarantees.
      </div>

      {/* Scenario comparison bars */}
      <div className="space-y-3">
        {scenarios.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <span className="w-24 text-sm font-medium text-ink-600">
              {s.label}
            </span>
            <div className="flex-1">
              <div className="h-8 overflow-hidden rounded-lg bg-ink-100">
                <div
                  className={cn(
                    "flex h-full items-center justify-end rounded-lg pr-2 text-xs font-semibold text-white transition-[width] duration-700",
                    s.tone === "moss"
                      ? "bg-moss-600"
                      : s.tone === "info"
                        ? "bg-calendar"
                        : "bg-ink-400"
                  )}
                  style={{ width: `${(s.hours / maxHours) * 100}%` }}
                >
                  {s.hours} h/mo
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Key figures */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <FigureTile
          icon={Clock}
          value={`${forecast.annualHours} h`}
          label="Est. annual time saved"
        />
        <FigureTile
          icon={Timer}
          value={`${Math.round(forecast.eligibleCoverage * 100)}%`}
          label="Eligible coverage"
        />
        <FigureTile
          icon={CalendarCheck}
          value={`${forecast.manualCalendarChecksAvoided}/mo`}
          label="Calendar checks avoided"
        />
        <FigureTile
          icon={MailMinus}
          value={`${forecast.emailsAvoided}/mo`}
          label="Scheduling emails avoided"
        />
      </div>

      {/* Cycle time before/after */}
      <div className="rounded-2xl border border-ink-100 bg-ink-50/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
          Projected scheduling cycle time
        </p>
        <div className="mt-3 flex items-center gap-4">
          <div className="flex-1 rounded-xl bg-white p-3 text-center">
            <p className="text-xs text-ink-400">Before</p>
            <p className="text-xl font-bold text-ink-700">
              {forecast.cycleTimeBeforeDays} days
            </p>
          </div>
          <ChevronDown className="-rotate-90 text-ink-300" size={20} />
          <div className="flex-1 rounded-xl bg-moss-50 p-3 text-center">
            <p className="text-xs text-moss-600">After</p>
            <p className="text-xl font-bold text-moss-700">
              {forecast.cycleTimeAfterDays < 1
                ? "under 1 day"
                : `${forecast.cycleTimeAfterDays} days`}
            </p>
          </div>
        </div>
      </div>

      {/* How SLOTH calculated this */}
      <div className="rounded-2xl border border-ink-100">
        <button
          onClick={() => setShowMath((s) => !s)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-ink-700 focus-ring rounded-2xl"
        >
          How SLOTH calculated this
          <ChevronDown
            size={18}
            className={cn(
              "text-ink-400 transition-transform",
              showMath && "rotate-180"
            )}
          />
        </button>
        {showMath && (
          <div className="space-y-3 border-t border-ink-100 px-4 py-3 text-sm text-ink-600 animate-fade-in">
            <code className="block rounded-lg bg-ink-900 px-3 py-2 text-xs leading-relaxed text-moss-100">
              Eligible workflow runs × (manual time per run − review time per
              run) − exception handling time
            </code>
            <p>
              We multiply how often the workflow runs by the time saved per run
              (manual effort minus the time you spend reviewing SLOTH's draft),
              then subtract a buffer for exceptions that still need you.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function FigureTile({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Clock;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-3">
      <Icon size={16} className="text-moss-500" />
      <p className="mt-2 text-lg font-bold text-ink-900">{value}</p>
      <p className="text-xs text-ink-400">{label}</p>
    </div>
  );
}
