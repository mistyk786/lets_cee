import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, WATCHER_POLL_MS } from "@/lib/api";
import { api } from "@/lib/api";
import { isBackendConfigured } from "@/lib/http";
import type {
  ActiveAutomation,
  AutomationRule,
  SlothNotification,
  WatcherStatus,
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

  setNotifications: (items: SlothNotification[]) => void;
  refreshNotifications: () => Promise<void>;

  assistantOpen: boolean;
  setAssistantOpen: (open: boolean) => void;

  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean | ((prev: boolean) => boolean)) => void;

  watcherStatus: WatcherStatus | null;
  refreshWatcherStatus: () => Promise<void>;
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
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [watcherStatus, setWatcherStatus] = useState<WatcherStatus | null>(
    null
  );

  const refreshWatcherStatus = async () => {
    const status = await api.getWatcherStatus();
    setWatcherStatus(status);
  };

  const refreshNotifications = async () => {
    const items = await api.getNotifications();
    setNotifications(items);
  };

  useEffect(() => {
    api.getActiveAutomations().then(setActiveAutomations);
    void refreshWatcherStatus();
    const interval = setInterval(() => void refreshWatcherStatus(), WATCHER_POLL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isBackendConfigured()) {
      api.getNotifications().then(setNotifications);
      return;
    }

    void refreshNotifications();
    const interval = window.setInterval(() => {
      void refreshNotifications();
    }, 15_000);

    return () => window.clearInterval(interval);
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
      setNotifications,
      refreshNotifications,
      assistantOpen,
      setAssistantOpen,
      commandPaletteOpen,
      setCommandPaletteOpen,
      watcherStatus,
      refreshWatcherStatus,
    }),
    [
      demoLoaded,
      notifications,
      activeAutomations,
      draftRules,
      assistantOpen,
      commandPaletteOpen,
      watcherStatus,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
