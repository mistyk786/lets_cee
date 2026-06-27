import { Search } from "lucide-react";

type Props = {
  patterns: string[];
  className?: string;
};

export function DetectedPatternsPanel({ patterns, className }: Props) {
  if (patterns.length === 0) return null;

  return (
    <div
      className={`rounded-2xl border border-moss-200/80 bg-moss-50/50 p-5 ${className ?? ""}`}
    >
      <div className="flex items-center gap-2">
        <Search size={16} className="text-moss-600" />
        <p className="font-mono text-[11px] uppercase tracking-label text-ink-500">
          Patterns Sloth found in your mail
        </p>
      </div>
      <ul className="mt-3 space-y-2">
        {patterns.map((pattern) => (
          <li
            key={pattern}
            className="rounded-xl border border-white/80 bg-white/70 px-3 py-2.5 text-sm leading-relaxed text-ink-700"
          >
            {pattern}
          </li>
        ))}
      </ul>
    </div>
  );
}
