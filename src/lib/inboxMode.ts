const MODE_KEY = "sloth_inbox_mode";
const SESSION_KEY = "sloth_inbox_session";

export type InboxMode = "demo" | "own";

export function getInboxMode(): InboxMode {
  try {
    return localStorage.getItem(MODE_KEY) === "own" ? "own" : "demo";
  } catch {
    return "demo";
  }
}

export function setInboxMode(mode: InboxMode): void {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function getInboxSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function setInboxSessionId(sessionId: string | null): void {
  try {
    if (sessionId) {
      localStorage.setItem(SESSION_KEY, sessionId);
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    /* ignore */
  }
}

/** Headers for API calls — demo mode uses server inbox; own mode uses session. */
export function inboxRequestHeaders(): Record<string, string> {
  const mode = getInboxMode();
  const headers: Record<string, string> = {
    "X-Sloth-Inbox-Mode": mode,
  };
  if (mode === "own") {
    const sessionId = getInboxSessionId();
    if (sessionId) {
      headers["X-Sloth-Session"] = sessionId;
    }
  }
  return headers;
}

/** @deprecated use inboxRequestHeaders */
export function inboxSessionHeaders(): Record<string, string> {
  return inboxRequestHeaders();
}

export type InboxSessionInfo = {
  connected: boolean;
  email?: string;
  emailMasked?: string;
  provider?: string;
  includesSentMail?: boolean;
  sessionExpiresHours?: number;
};

export type DemoInboxInfo = {
  available: boolean;
  emailMasked?: string;
};

export function mapInboxSession(raw: Record<string, unknown>): InboxSessionInfo {
  return {
    connected: Boolean(raw.connected),
    email: raw.email as string | undefined,
    emailMasked: raw.email_masked as string | undefined,
    provider: raw.provider as string | undefined,
    includesSentMail: raw.includes_sent_mail as boolean | undefined,
    sessionExpiresHours: raw.session_expires_hours as number | undefined,
  };
}

export function mapDemoInboxInfo(raw: Record<string, unknown>): DemoInboxInfo {
  return {
    available: Boolean(raw.demo_inbox_available ?? raw.imap_configured),
    emailMasked: (raw.server_imap_email_masked as string | undefined) ?? undefined,
  };
}

export async function applyInboxMode(
  mode: InboxMode,
  disconnect?: () => Promise<void>
): Promise<void> {
  setInboxMode(mode);
  if (mode === "demo") {
    setInboxSessionId(null);
    if (disconnect) {
      await disconnect();
    }
  }
}
