import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { LandingPage } from "@/pages/LandingPage";
import { SetupPage } from "@/pages/SetupPage";
import { OverviewPage } from "@/pages/OverviewPage";
import { OpportunitiesPage } from "@/pages/OpportunitiesPage";
import { OpportunityDetailPage } from "@/pages/OpportunityDetailPage";
import { ActiveAutomationsPage } from "@/pages/ActiveAutomationsPage";
import { EffectivenessPage } from "@/pages/EffectivenessPage";
import { AutomatePage } from "@/pages/AutomatePage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/automate/:notificationId" element={<AutomatePage />} />
      <Route element={<AppShell />}>
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/opportunities" element={<OpportunitiesPage />} />
        <Route
          path="/opportunities/:id"
          element={<OpportunityDetailPage />}
        />
        <Route path="/automations" element={<ActiveAutomationsPage />} />
        <Route path="/insights" element={<EffectivenessPage />} />
        <Route
          path="/effectiveness/:id"
          element={<EffectivenessPage />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
