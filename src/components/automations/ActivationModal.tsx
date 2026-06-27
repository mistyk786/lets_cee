import { ShieldCheck, Clock, Zap } from "lucide-react";
import type { AutomationRule, Forecast } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { AutomationRuleSummary } from "./AutomationRuleSummary";
import { APPROVAL_MODE_LABELS } from "@/lib/utils";

export function ActivationModal({
  open,
  onClose,
  onActivate,
  onSaveForLater,
  rule,
  forecast,
  name,
  activating,
}: {
  open: boolean;
  onClose: () => void;
  onActivate: () => void;
  onSaveForLater: () => void;
  rule: AutomationRule;
  forecast: Forecast;
  name: string;
  activating?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Activate automation"
      description="Review the safety settings before you turn this on."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onSaveForLater} disabled={activating}>
            Save for later
          </Button>
          <Button onClick={onActivate} disabled={activating}>
            {activating ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white [animation:spin_0.8s_linear_infinite]" />
                Activating…
              </>
            ) : (
              <>
                <Zap size={16} />
                Activate Safely
              </>
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Automation name
          </p>
          <p className="mt-0.5 text-lg font-semibold text-ink-900">{name}</p>
        </div>

        <AutomationRuleSummary rule={rule} />

        <div className="flex items-start gap-3 rounded-xl border border-moss-200 bg-moss-50 p-4">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-moss-600" />
          <div>
            <p className="text-sm font-semibold text-ink-900">Safety setting</p>
            <p className="text-sm text-ink-600">
              {rule.approvalMode === "approval_required"
                ? "Human approval required before any email is sent."
                : APPROVAL_MODE_LABELS[rule.approvalMode]}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-4">
          <Clock size={20} className="shrink-0 text-calendar" />
          <div>
            <p className="text-sm font-semibold text-ink-900">Forecast</p>
            <p className="text-sm text-ink-600">
              Likely savings:{" "}
              <strong>{forecast.likelyHours} hours/month</strong>
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
