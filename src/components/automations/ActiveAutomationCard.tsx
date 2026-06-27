import { useNavigate } from "react-router-dom";
import {
  Zap,
  Pause,
  SlidersHorizontal,
  LineChart,
  Clock,
  Activity,
} from "lucide-react";
import type { ActiveAutomation } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ScoreRing } from "@/components/ui/Progress";
import {
  APPROVAL_MODE_LABELS,
  formatDate,
  formatRelativeDate,
} from "@/lib/utils";

export function ActiveAutomationCard({
  automation,
  onPause,
}: {
  automation: ActiveAutomation;
  onPause: (id: string) => void;
}) {
  const navigate = useNavigate();
  const needsReview = automation.status === "needs_review";

  return (
    <div className="card overflow-hidden">
      <div className="grid gap-5 p-5 lg:grid-cols-[auto,1fr,auto]">
        {/* Score */}
        <div className="flex items-center justify-center">
          <ScoreRing
            score={automation.effectivenessScore}
            size={96}
            stroke={8}
            label="score"
          />
        </div>

        {/* Details */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-ink-900">
              {automation.name}
            </h3>
            <Badge tone={needsReview ? "warning" : "success"} dot>
              {needsReview ? "Needs review" : "Active"}
            </Badge>
          </div>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-ink-500">
            <Zap size={14} className="text-moss-600" />
            {APPROVAL_MODE_LABELS[automation.approvalMode]}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <Detail
              label="Activated"
              value={formatDate(automation.activatedAt)}
            />
            <Detail
              label="Runs completed"
              value={String(automation.runsCompleted)}
            />
            <Detail
              label="Time saved"
              value={`${Math.round((automation.estimatedMinutesSaved / 60) * 10) / 10} hrs`}
              icon={<Clock size={13} />}
            />
            <Detail
              label="Last activity"
              value={formatRelativeDate(automation.lastActivity)}
              icon={<Activity size={13} />}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-row gap-2 lg:flex-col">
          <Button
            size="sm"
            onClick={() => navigate(`/effectiveness/${automation.opportunityId}`)}
          >
            <LineChart size={15} />
            View performance
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate(`/opportunities/${automation.opportunityId}`)}
          >
            <SlidersHorizontal size={15} />
            Edit rules
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onPause(automation.id)}
          >
            <Pause size={15} />
            Pause
          </Button>
        </div>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-ink-400">{label}</p>
      <p className="mt-0.5 inline-flex items-center gap-1 font-medium text-ink-800">
        {icon}
        {value}
      </p>
    </div>
  );
}
