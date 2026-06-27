import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import type {
  ActiveAutomation,
  AutomationRule,
  SlothNotification,
} from "@/lib/types";

type AppState = {
  /** Whether the user has loaded the demo dataset (gates the dashboard). */
  demoLoaded: boolean;
  loadDemo: () => void;

  notifications: SlothNotification[];
  unreadCount: number;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;

  /** Automations the user has activated in this session (plus seeded ones). */
  activeAutomations: ActiveAutomation[];
  addActiveAutomation: (automation: ActiveAutomation) => void;

  /** Per-opportunity rule edits, so configure → forecast → activate share state. */
  draftRules: Record<string, AutomationRule>;
  setDraftRules: (opportunityId: string, rules: AutomationRule) => void;

  assistantOpen: boolean;
  setAssistantOpen: (open: boolean) => void;
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [notifications, setNotifications] = useState<SlothNotification[]>([]);
  const [activeAutomations, setActiveAutomations] = useState<
    ActiveAutomation[]
  >([]);
  const [draftRules, setDraftRulesState] = useState<
    Record<string, AutomationRule>
  >({});
  const [assistantOpen, setAssistantOpen] = useState(false);

  useEffect(() => {
    api.getNotifications().then(setNotifications);
    api.getActiveAutomations().then(setActiveAutomations);
  }, []);

  const markNotificationRead = (id: string) =>
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const addActiveAutomation = (automation: ActiveAutomation) =>
    setActiveAutomations((prev) => {
      const without = prev.filter((a) => a.id !== automation.id);
      return [automation, ...without];
    });

  const setDraftRules = (opportunityId: string, rules: AutomationRule) =>
    setDraftRulesState((prev) => ({ ...prev, [opportunityId]: rules }));

  const value = useMemo<AppState>(
    () => ({
      demoLoaded,
      loadDemo: () => setDemoLoaded(true),
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      markNotificationRead,
      markAllRead,
      activeAutomations,
      addActiveAutomation,
      draftRules,
      setDraftRules,
      assistantOpen,
      setAssistantOpen,
    }),
    [demoLoaded, notifications, activeAutomations, draftRules, assistantOpen]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
