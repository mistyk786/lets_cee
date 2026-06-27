import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Inbox, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import type { OptimisationOpportunity } from "@/lib/types";
import { WatcherStatusPanel } from "@/components/layout/WatcherStatusPanel";
import { OpportunityCard } from "@/components/opportunities/OpportunityCard";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/LoadingState";
import { AssistantInsightCard } from "@/components/assistant/AssistantInsightCard";

export function OverviewPage() {
  const navigate = useNavigate();
  const { watcherStatus } = useApp();
  const [opportunities, setOpportunities] = useState<
    OptimisationOpportunity[] | null
  >(null);

  useEffect(() => {
    api.getOpportunities().then(setOpportunities);
  }, []);

  const primary = opportunities?.[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <SectionLabel index="01">Discover</SectionLabel>
          <h1 className="mt-2.5 font-display text-[2rem] font-medium leading-tight tracking-tighter text-ink-900">
            What should we automate?
          </h1>
          <p className="mt-2 max-w-xl text-ink-500">
            SLOTH finds repeatable work in your email and calendar. Pick an
            opportunity, choose how to automate it, and activate when you are
            ready.
          </p>
        </div>
        <Button onClick={() => navigate("/opportunities")}>
          <Inbox size={16} />
          All opportunities
        </Button>
      </div>

      <WatcherStatusPanel status={watcherStatus} compact />

      {!opportunities ? (
        <Skeleton className="h-40 w-full" />
      ) : opportunities.length === 0 ? (
        <div className="card p-8 text-center">
          <Sparkles size={28} className="mx-auto text-moss-600" />
          <p className="mt-3 font-medium text-ink-900">No patterns yet</p>
          <p className="mt-1 text-sm text-ink-500">
            Run analysis from Setup to detect your first automation opportunity.
          </p>
          <Button className="mt-4" onClick={() => navigate("/setup")}>
            Analyse activity
            <ArrowRight size={16} />
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="font-mono text-[11px] uppercase tracking-label text-ink-400">
            Top opportunity
          </p>
          <OpportunityCard opportunity={primary!} />
          {opportunities.length > 1 && (
            <Button
              variant="secondary"
              onClick={() => navigate("/opportunities")}
            >
              View {opportunities.length - 1} more
              <ArrowRight size={16} />
            </Button>
          )}
        </div>
      )}

      <AssistantInsightCard
        context="overview"
        onAction={() =>
          navigate(
            `/opportunities/${primary?.id ?? api.getPrimaryOpportunityId()}`
          )
        }
      />
    </div>
  );
}
