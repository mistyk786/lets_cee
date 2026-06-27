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
import { SectionLabel } from "@/components/ui/SectionLabel";
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
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-xl border border-ink-200/60 bg-ink-50/50 px-3 py-2.5">
        <Info size={14} className="mt-0.5 shrink-0 text-ink-400" />
        <p className="font-mono text-[11px] leading-relaxed text-ink-500">
          Estimates based on observed workflow frequency and your editable
          assumptions — not guarantees.
        </p>
      </div>

      {/* Scenario comparison */}
      <div>
        <SectionLabel index="A">Time saved scenarios</SectionLabel>
        <div className="mt-4 space-y-3">
          {scenarios.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="w-24 font-mono text-[11px] uppercase tracking-label text-ink-500">
                {s.label}
              </span>
              <div className="flex-1">
                <div className="h-9 overflow-hidden rounded-lg bg-ink-100/80 ring-1 ring-inset ring-ink-200/50">
                  <div
                    className={cn(
                      "flex h-full items-center justify-end rounded-lg pr-2.5 font-mono text-[11px] font-medium tnum text-white transition-[width] duration-700",
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
      </div>

      {/* Key figures ledger */}
      <div>
        <SectionLabel index="B">Impact ledger</SectionLabel>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <FigureTile
            icon={Clock}
            value={`${forecast.annualHours}`}
            unit="h"
            label="Annual saved"
          />
          <FigureTile
            icon={Timer}
            value={`${Math.round(forecast.eligibleCoverage * 100)}`}
            unit="%"
            label="Eligible coverage"
          />
          <FigureTile
            icon={CalendarCheck}
            value={`${forecast.manualCalendarChecksAvoided}`}
            unit="/mo"
            label="Calendar checks"
          />
          <FigureTile
            icon={MailMinus}
            value={`${forecast.emailsAvoided}`}
            unit="/mo"
            label="Emails avoided"
          />
        </div>
      </div>

      {/* Cycle time before/after */}
      <div className="card bg-dots p-4">
        <SectionLabel>Cycle time projection</SectionLabel>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex-1 rounded-xl bg-white/80 p-3 text-center ring-1 ring-inset ring-ink-200/50">
            <p className="font-mono text-[10px] uppercase tracking-label text-ink-400">
              Before
            </p>
            <p className="mt-1 font-display text-2xl font-medium tracking-tighter tnum text-ink-700">
              {forecast.cycleTimeBeforeDays}
              <span className="ml-1 font-mono text-xs text-ink-400">days</span>
            </p>
          </div>
          <ChevronDown className="-rotate-90 text-ink-300" size={20} />
          <div className="flex-1 rounded-xl bg-moss-50/80 p-3 text-center ring-1 ring-inset ring-moss-200/50">
            <p className="font-mono text-[10px] uppercase tracking-label text-moss-600">
              After
            </p>
            <p className="mt-1 font-display text-2xl font-medium tracking-tighter tnum text-moss-700">
              {forecast.cycleTimeAfterDays < 1 ? (
                <>
                  &lt;1
                  <span className="ml-1 font-mono text-xs text-moss-500/80">
                    day
                  </span>
                </>
              ) : (
                <>
                  {forecast.cycleTimeAfterDays}
                  <span className="ml-1 font-mono text-xs text-moss-500/80">
                    days
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* How SLOTH calculated this */}
      <div className="card overflow-hidden">
        <button
          onClick={() => setShowMath((s) => !s)}
          className="flex w-full items-center justify-between px-4 py-3 text-left focus-ring"
        >
          <span className="font-mono text-[11px] uppercase tracking-label text-ink-600">
            How SLOTH calculated this
          </span>
          <ChevronDown
            size={18}
            className={cn(
              "text-ink-400 transition-transform duration-200",
              showMath && "rotate-180"
            )}
          />
        </button>
        {showMath && (
          <div className="space-y-3 border-t border-ink-200/70 px-4 py-3 animate-fade-in">
            <code className="block rounded-lg bg-ink-900 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-moss-100">
              eligible_runs × (manual_min − review_min) − exception_min
            </code>
            <p className="text-sm leading-relaxed text-ink-600">
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
  unit,
  label,
}: {
  icon: typeof Clock;
  value: string;
  unit: string;
  label: string;
}) {
  return (
    <div className="card p-3">
      <Icon size={15} className="text-moss-500" />
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-display text-2xl font-medium tracking-tighter tnum text-ink-900">
          {value}
        </span>
        <span className="font-mono text-xs text-ink-400">{unit}</span>
      </div>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-label text-ink-400">
        {label}
      </p>
    </div>
  );
}
