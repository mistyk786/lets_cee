import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Inbox } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { ActiveAutomationCard } from "@/components/automations/ActiveAutomationCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export function ActiveAutomationsPage() {
  const navigate = useNavigate();
  const { activeAutomations, addActiveAutomation } = useApp();
  const [pausing, setPausing] = useState<string | null>(null);

  async function handlePause(autoId: string) {
    setPausing(autoId);
    await api.pauseAutomation(autoId);
    const target = activeAutomations.find((a) => a.id === autoId);
    if (target) addActiveAutomation({ ...target, status: "paused" });
    setPausing(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Zap size={22} className="text-moss-600" />
          <h1 className="text-2xl font-bold text-ink-900">
            Active Automations
          </h1>
        </div>
        <p className="text-ink-500">
          Automations you've activated, with their live effectiveness and
          safety status.
        </p>
      </div>

      {activeAutomations.length === 0 ? (
        <EmptyState
          icon={<Inbox size={22} />}
          title="No active automations yet"
          description="Review an opportunity and activate it in approval mode to see it here."
          action={
            <Button onClick={() => navigate("/opportunities")}>
              Browse opportunities
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {activeAutomations.map((automation) => (
            <div
              key={automation.id}
              className={pausing === automation.id ? "opacity-60" : ""}
            >
              <ActiveAutomationCard
                automation={automation}
                onPause={handlePause}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
