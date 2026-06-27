import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Inbox, Bell, ArrowRight, X, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import type { OptimisationOpportunity } from "@/lib/types";
import { OpportunityCard } from "@/components/opportunities/OpportunityCard";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";

type Filter = "all" | "new" | "ready_to_review" | "needs_review";

export function OpportunitiesPage() {
  const navigate = useNavigate();
  const { notifications, markNotificationRead } = useApp();
  const [opportunities, setOpportunities] = useState<
    OptimisationOpportunity[] | null
  >(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    api.getOpportunities().then(setOpportunities);
  }, []);

  const proactive = notifications.find(
    (n) => !n.read && n.recoverableMinutesPerWeek != null
  );

  const filtered = useMemo(() => {
    if (!opportunities) return [];
    if (filter === "all") return opportunities;
    if (filter === "new")
      return opportunities.filter((o) => o.status === "detected");
    return opportunities.filter((o) => o.status === filter);
  }, [opportunities, filter]);

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "new", label: "New" },
    { key: "ready_to_review", label: "Ready to review" },
    { key: "needs_review", label: "Needs review" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <SectionLabel index="02">Continuous discovery</SectionLabel>
        <div className="mt-2.5 flex items-center gap-2.5">
          <Inbox size={22} className="text-moss-600" />
          <h1 className="font-display text-[2rem] font-medium leading-tight tracking-tighter text-ink-900">
            Opportunities
          </h1>
        </div>
        <p className="mt-1 text-ink-500">
          The home for workflow improvements SLOTH discovers. It gets more
          valuable as it observes more repeatable work over time.
        </p>
      </div>

      {/* Proactive notification banner */}
      {proactive && !dismissed && (
        <div className="relative overflow-hidden rounded-2xl border border-moss-200 bg-gradient-to-r from-moss-50 to-white p-5 shadow-soft">
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="absolute right-3 top-3 rounded-lg p-1 text-ink-400 hover:bg-ink-100"
          >
            <X size={16} />
          </button>
          <div className="flex items-start gap-4">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-moss-600 text-white">
              <Bell size={18} />
              <span className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-moss-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-moss-500 ring-2 ring-white" />
              </span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-ink-900">{proactive.title}</p>
              <p className="mt-1 text-sm text-ink-600">{proactive.message}</p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-moss-700">
                <TrendingUp size={14} />
                Estimated recoverable time:{" "}
                {proactive.recoverableMinutesPerWeek} minutes per week.
              </p>
              <div className="mt-3">
                <Button
                  size="sm"
                  onClick={() => {
                    markNotificationRead(proactive.id);
                    navigate(`/opportunities/${proactive.opportunityId}`);
                  }}
                >
                  Review opportunity
                  <ArrowRight size={15} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-ring ${
              filter === f.key
                ? "bg-moss-600 text-white"
                : "bg-white text-ink-600 border border-ink-200 hover:bg-ink-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {!opportunities ? (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Inbox size={22} />}
          title="No opportunities in this view"
          description="As SLOTH observes more approved activity, new optimisation opportunities will appear here."
          action={
            <Button variant="secondary" onClick={() => setFilter("all")}>
              Show all
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} />
          ))}
        </div>
      )}
    </div>
  );
}
