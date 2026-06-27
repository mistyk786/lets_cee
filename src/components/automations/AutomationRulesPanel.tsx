import type { ReactNode } from "react";
import type { ApprovalMode, AutomationRule } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Editable automation rules. Fully controlled: every change calls `onChange`
 * with the next rule object so the live rule summary + forecast stay in sync.
 */
export function AutomationRulesPanel({
  rule,
  onChange,
}: {
  rule: AutomationRule;
  onChange: (next: AutomationRule) => void;
}) {
  const set = <K extends keyof AutomationRule>(
    key: K,
    value: AutomationRule[K]
  ) => onChange({ ...rule, [key]: value });

  return (
    <div className="space-y-6">
      {/* Scope */}
      <Field label="Scope" hint="Which contacts SLOTH will act on.">
        <SegmentedControl
          value={rule.internalOnly ? "internal" : "both"}
          onChange={(v) => set("internalOnly", v === "internal")}
          options={[
            { value: "internal", label: "Internal contacts only" },
            { value: "both", label: "Internal & external" },
          ]}
        />
      </Field>

      {/* Meeting duration */}
      <Field label="Meeting duration">
        <SegmentedControl
          value={String(rule.meetingDuration)}
          onChange={(v) => set("meetingDuration", Number(v))}
          options={[15, 30, 45, 60].map((d) => ({
            value: String(d),
            label: `${d} min`,
          }))}
        />
      </Field>

      {/* Working hours */}
      <Field label="Working hours" hint="SLOTH only proposes slots in this window.">
        <div className="flex items-center gap-3">
          <TimeInput
            label="Start"
            value={rule.workingHoursStart}
            onChange={(v) => set("workingHoursStart", v)}
          />
          <span className="mt-5 text-ink-400">to</span>
          <TimeInput
            label="End"
            value={rule.workingHoursEnd}
            onChange={(v) => set("workingHoursEnd", v)}
          />
        </div>
      </Field>

      {/* Suggested slots */}
      <Field label="Suggested slots">
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={1}
            max={5}
            value={rule.maxSuggestedSlots}
            onChange={(e) => set("maxSuggestedSlots", Number(e.target.value))}
            aria-label="Maximum suggested slots"
            className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-ink-100 accent-moss-600"
          />
          <span className="w-20 text-right text-sm font-semibold text-ink-800">
            {rule.maxSuggestedSlots} slot{rule.maxSuggestedSlots > 1 ? "s" : ""}
          </span>
        </div>
      </Field>

      {/* Approval mode */}
      <Field
        label="Approval mode"
        hint="How much control you keep before anything is sent."
      >
        <div className="space-y-2">
          {(
            [
              {
                value: "draft",
                label: "Draft only",
                desc: "SLOTH prepares a draft; you send it.",
              },
              {
                value: "approval_required",
                label: "Require approval before send",
                desc: "Recommended — review every reply first.",
              },
              {
                value: "trusted_internal_auto_send",
                label: "Auto-send for trusted internal contacts",
                desc: "Faster, but used only once it performs reliably.",
              },
            ] as { value: ApprovalMode; label: string; desc: string }[]
          ).map((opt) => (
            <RadioRow
              key={opt.value}
              selected={rule.approvalMode === opt.value}
              onClick={() => set("approvalMode", opt.value)}
              label={opt.label}
              desc={opt.desc}
            />
          ))}
        </div>
      </Field>

      {/* Calendar behaviour */}
      <Field label="Calendar behaviour">
        <div className="space-y-2">
          <RadioRow
            selected={rule.createTentativeEvent}
            onClick={() => set("createTentativeEvent", true)}
            label="Create tentative event after confirmation"
          />
          <RadioRow
            selected={!rule.createTentativeEvent}
            onClick={() => set("createTentativeEvent", false)}
            label="Do not create event automatically"
          />
        </div>
      </Field>

      {/* Safety exclusions */}
      <Field
        label="Safety exclusions"
        hint="SLOTH escalates these to you instead of acting."
      >
        <div className="space-y-2">
          <ToggleRow
            checked={rule.escalateExternal}
            onChange={(v) => set("escalateExternal", v)}
            label="Escalate external-client requests"
          />
          <ToggleRow
            checked={rule.avoidSensitiveKeywords}
            onChange={(v) => set("avoidSensitiveKeywords", v)}
            label="Avoid sensitive-keyword emails"
          />
          <ToggleRow
            checked={rule.avoidOutsideWorkingHours}
            onChange={(v) => set("avoidOutsideWorkingHours", v)}
            label="Avoid scheduling outside working hours"
          />
        </div>
      </Field>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2">
        <p className="text-sm font-semibold text-ink-800">{label}</p>
        {hint && <p className="text-xs text-ink-400">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function SegmentedControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl bg-ink-100 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-ring",
            value === opt.value
              ? "bg-white text-ink-900 shadow-soft"
              : "text-ink-500 hover:text-ink-700"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function TimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-ink-400">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm text-ink-800 focus-ring"
      />
    </label>
  );
}

function RadioRow({
  selected,
  onClick,
  label,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  desc?: string;
}) {
  return (
    <button
      onClick={onClick}
      role="radio"
      aria-checked={selected}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors focus-ring",
        selected
          ? "border-moss-400 bg-moss-50"
          : "border-ink-200 bg-white hover:bg-ink-50"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
          selected ? "border-moss-600" : "border-ink-300"
        )}
      >
        {selected && <span className="h-2 w-2 rounded-full bg-moss-600" />}
      </span>
      <span>
        <span className="block text-sm font-medium text-ink-800">{label}</span>
        {desc && <span className="block text-xs text-ink-500">{desc}</span>}
      </span>
    </button>
  );
}

function ToggleRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className="flex w-full items-center justify-between rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-left transition-colors hover:bg-ink-50 focus-ring"
    >
      <span className="text-sm text-ink-700">{label}</span>
      <span
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors",
          checked ? "bg-moss-600" : "bg-ink-200"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
            checked ? "left-4" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}
