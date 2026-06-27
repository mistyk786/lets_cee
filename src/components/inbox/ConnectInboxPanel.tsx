import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Lock, Mail, Unplug } from "lucide-react";
import { api } from "@/lib/api";
import type { InboxSessionInfo } from "@/lib/inboxMode";
import { Button } from "@/components/ui/Button";

type Props = {
  onConnected?: () => void;
  className?: string;
};

export function ConnectInboxPanel({ onConnected, className }: Props) {
  const [email, setEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [provider, setProvider] = useState("gmail");
  const [session, setSession] = useState<InboxSessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getInboxSession().then((info) => {
      setSession(info);
      setLoading(false);
    });
  }, []);

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const info = await api.connectInbox({ email, appPassword, provider });
      setSession(info);
      setAppPassword("");
      onConnected?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect. Check your app password and try again."
      );
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    await api.disconnectInbox();
    setSession({ connected: false });
    setEmail("");
  }

  if (loading) {
    return (
      <div className={`card flex items-center gap-2 p-5 text-sm text-ink-500 ${className ?? ""}`}>
        <Loader2 size={16} className="animate-spin" /> Checking inbox connection…
      </div>
    );
  }

  if (session?.connected) {
    return (
      <div className={`card p-5 ${className ?? ""}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="mt-0.5 text-moss-600" />
            <div>
              <p className="text-sm font-semibold text-ink-900">Inbox connected</p>
              <p className="mt-1 text-sm text-ink-600">
                {session.emailMasked ?? session.email}
                {session.includesSentMail ? " · inbox + sent" : ""}
              </p>
              <p className="mt-1 text-xs text-ink-400">
                Sloth reads your mail read-only. Nothing is sent without your approval.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDisconnect}>
            <Unplug size={14} /> Disconnect
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`card space-y-4 p-5 ${className ?? ""}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-moss-100 text-moss-700">
          <Mail size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-900">Connect your inbox</p>
          <p className="mt-1 text-sm text-ink-600">
            Sign in with your email and an app password — no OAuth setup required.
            Sloth analyses your received and sent mail for repeatable patterns.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
            Email address
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@gmail.com"
            className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-moss-400"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
            App password
          </span>
          <input
            type="password"
            value={appPassword}
            onChange={(e) => setAppPassword(e.target.value)}
            placeholder="16-character app password"
            className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-moss-400"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
            Provider
          </span>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-moss-400"
          >
            <option value="gmail">Gmail</option>
            <option value="outlook">Outlook</option>
            <option value="icloud">iCloud</option>
          </select>
        </label>
      </div>

      <p className="flex items-start gap-2 text-xs text-ink-500">
        <Lock size={14} className="mt-0.5 shrink-0" />
        Gmail: Google Account → Security → 2-Step Verification → App passwords.
        Your password is kept in memory on the server for this session only.
      </p>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <Button
        className="w-full sm:w-auto"
        disabled={connecting || !email || appPassword.length < 8}
        onClick={handleConnect}
      >
        {connecting ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Connecting…
          </>
        ) : (
          "Connect inbox"
        )}
      </Button>
    </div>
  );
}
