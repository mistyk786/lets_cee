import type { LucideIcon } from "lucide-react";

export function ValueCard({
  icon: Icon,
  title,
  description,
  accent,
  index,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: string;
  index?: string;
}) {
  return (
    <div className="card card-interactive group relative p-6">
      {index && (
        <span className="absolute right-5 top-5 font-mono text-[11px] tracking-label text-ink-300">
          {index}
        </span>
      )}
      <div
        className="flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-inset highlight-top transition-transform duration-200 ease-smooth group-hover:scale-105"
        style={{
          backgroundColor: `${accent}14`,
          color: accent,
          boxShadow: `inset 0 0 0 1px ${accent}1f`,
        }}
      >
        <Icon size={22} />
      </div>
      <h3 className="mt-5 font-display text-lg font-medium tracking-tight text-ink-900">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">{description}</p>
    </div>
  );
}
