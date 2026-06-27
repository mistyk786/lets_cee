import type { LucideIcon } from "lucide-react";

export function ValueCard({
  icon: Icon,
  title,
  description,
  accent,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <div className="group rounded-2xl border border-ink-200/70 bg-white p-6 shadow-soft transition-shadow hover:shadow-lift">
      <div
        className="flex h-11 w-11 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${accent}1a`, color: accent }}
      >
        <Icon size={22} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-ink-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
        {description}
      </p>
    </div>
  );
}
