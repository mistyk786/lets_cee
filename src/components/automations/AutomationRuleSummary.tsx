import type { AutomationRule } from "@/lib/types";
import { buildRuleSummary } from "@/lib/utils";

const ROWS = [
  { key: "when", keyword: "WHEN", tone: "#6d5bd0" },
  { key: "doStep", keyword: "DO", tone: "#3d8c62" },
  { key: "require", keyword: "REQUIRE", tone: "#b9863f" },
  { key: "then", keyword: "THEN", tone: "#2f7fae" },
] as const;

/** Live "WHEN / DO / REQUIRE / THEN" rule block that updates with the controls. */
export function AutomationRuleSummary({ rule }: { rule: AutomationRule }) {
  const summary = buildRuleSummary(rule);

  return (
    <div className="rounded-2xl bg-ink-900 p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">
        Generated rule
      </p>
      <div className="space-y-2.5">
        {ROWS.map((row) => {
          const text = summary[row.key].replace(`${row.keyword} `, "");
          return (
            <div key={row.key} className="flex gap-2.5 text-sm leading-relaxed">
              <span
                className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold"
                style={{ color: row.tone, backgroundColor: `${row.tone}26` }}
              >
                {row.keyword}
              </span>
              <span className="text-ink-100">{text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
