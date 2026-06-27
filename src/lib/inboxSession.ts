const STORAGE_KEY = "sloth_inbox_session";

export function getInboxSessionId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setInboxSessionId(sessionId: string | null): void {
  try {
    if (sessionId) {
      localStorage.setItem(STORAGE_KEY, sessionId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function inboxSessionHeaders(): Record<string, string> {
  const sessionId = getInboxSessionId();
  return sessionId ? { "X-Sloth-Session": sessionId } : {};
}

export type InboxSessionInfo = {
  connected: boolean;
  email?: string;
  emailMasked?: string;
  provider?: string;
  includesSentMail?: boolean;
  sessionExpiresHours?: number;
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
