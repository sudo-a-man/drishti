"use client";
import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";

type Status = { configured: boolean; connected: boolean; at: number | null };

export default function FyersConnect() {
  const [status, setStatus] = useState<Status | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const r = await fetch("/api/fyers/status", { cache: "no-store" });
      setStatus(await r.json());
    } catch {
      setStatus(null);
    }
  };
  useEffect(() => {
    refresh();
  }, []);

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/fyers/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const j = await r.json();
      if (!r.ok) setMsg(j.error || "Could not connect.");
      else {
        setMsg("Connected — live data is on.");
        setCode("");
        refresh();
      }
    } catch {
      setMsg("Could not connect.");
    } finally {
      setBusy(false);
    }
  };

  const ageText = (at: number | null) => {
    if (!at) return "";
    const mins = Math.round((Date.now() - at) / 60000);
    return mins < 60 ? `connected ${mins}m ago` : `connected ${Math.round(mins / 60)}h ago`;
  };

  return (
    <Card className="mt-4 flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">Live data · Fyers</h2>
        {status && (
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${status.connected ? "text-success" : "text-text-muted"}`}>
            <span className={`h-2 w-2 rounded-full ${status.connected ? "bg-success" : "bg-text-faint"}`} />
            {!status.configured ? "Keys not set" : status.connected ? "Connected" : "Not connected"}
          </span>
        )}
      </div>
      <p className="text-sm text-text-muted">
        Fyers access resets every day. {status?.connected ? ageText(status.at) + " — " : ""}reconnect once a day to keep charts, options and the live board flowing.
      </p>

      {status && !status.configured ? (
        <p className="text-sm text-warning">Add FYERS_APP_ID and FYERS_SECRET_ID to .env.local, then restart the server.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <a href="/api/fyers/login"><Button>Reconnect Fyers</Button></a>
          </div>
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-2 p-3">
            <label htmlFor="fyers-code" className="text-sm font-medium">…or paste the auth code</label>
            <p className="text-xs text-text-muted">
              If the one-click reconnect can&apos;t return here (e.g. on a tunnel or deployed URL), authorize at Fyers, then paste the <code className="text-text">auth_code</code> from the address bar — or the whole redirected URL.
            </p>
            <input
              id="fyers-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="auth_code=… or the full redirect URL"
              className="h-10 rounded-md border border-border-input bg-surface px-3 text-sm text-text"
            />
            <div className="flex items-center gap-3">
              <Button onClick={submit} loading={busy} disabled={!code.trim()} size="sm">Connect</Button>
              {msg && <span className="text-xs text-text-muted">{msg}</span>}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
