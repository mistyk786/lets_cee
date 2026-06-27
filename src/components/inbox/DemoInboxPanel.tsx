import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { api } from "@/lib/api";
import type { DemoInboxInfo } from "@/lib/inboxMode";

const FALLBACK_DEMO_LABEL = "se***@gmail.com";

type Props = {
  className?: string;
};

export function DemoInboxPanel({ className }: Props) {
  const [info, setInfo] = useState<DemoInboxInfo | null>(null);

  useEffect(() => {
    api.getDemoInboxInfo().then(setInfo);
  }, []);

  const label = info?.emailMasked ?? FALLBACK_DEMO_LABEL;
  const ready = info?.available ?? true;

  return (
    <div className={`card p-5 ${className ?? ""}`}>
      <div className="flex items-start gap-3">
        {ready ? (
          <CheckCircle2 size={20} className="mt-0.5 text-moss-600" />
        ) : (
          <Loader2 size={20} className="mt-0.5 animate-spin text-ink-400" />
        )}
        <div>
          <p className="text-sm font-semibold text-ink-900">Demo inbox ready</p>
          <p className="mt-1 flex items-center gap-2 text-sm text-ink-600">
            <Mail size={14} className="text-email" />
            {label}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink-500">
            Sloth reads this shared demo Gmail (inbox + sent). Nothing is sent
            without approval — click Scan &amp; optimise to analyse real patterns
            in that account.
          </p>
          {!ready && (
            <p className="mt-2 text-xs text-amber-700">
              Demo IMAP is not configured on this server. Switch to “Use your
              email” or ask the host to set IMAP credentials.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
