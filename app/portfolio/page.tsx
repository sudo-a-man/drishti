"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Skeleton, Button } from "@/components/ui";

type Balance = { currency: string; balance: number; locked: number };
type Data = { balances: Balance[] };

export default function PortfolioPage() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);

  useEffect(() => {
    let on = true;
    const load = async () => {
      try {
        const r = await fetch("/api/crypto/holdings", { cache: "no-store" });
        if (r.status === 401) { if (on) { setNeedLogin(true); setData(null); } return; }
        const j = await r.json();
        if (!on) return;
        setNeedLogin(false);
        if (!r.ok) setErr(j.error || "Could not load holdings.");
        else { setData(j); setErr(null); }
      } catch {
        if (on) setErr("Could not load holdings.");
      }
    };
    load();
    const id = setInterval(load, 30000);
    return () => { on = false; clearInterval(id); };
  }, []);

  const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 8 });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        <span className="text-xs font-semibold uppercase tracking-wider text-accent-text">Portfolio</span>
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight">My crypto holdings</h1>
      <p className="mb-6 mt-1.5 max-w-2xl text-text-muted">Your CoinDCX balances, read-only. Nothing here places or changes trades.</p>

      {needLogin && (
        <Card className="flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-text-muted">Sign in to view your holdings.</p>
          <Link href="/login"><Button>Sign in</Button></Link>
        </Card>
      )}
      {err && !needLogin && <Card className="p-4 text-sm text-danger">{err}</Card>}
      {!data && !err && !needLogin && (
        <div className="flex flex-col gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      )}

      {data && (data.balances.length === 0 ? (
        <Card className="p-6 text-sm text-text-muted">No balances found on this CoinDCX account.</Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2/40 text-left text-xs uppercase tracking-wider text-text-faint">
                <th scope="col" className="px-3 py-2.5 font-semibold">Asset</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Available</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">In orders</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.balances.map((b) => (
                <tr key={b.currency} className="border-t border-border transition-colors hover:bg-surface-2">
                  <td className="px-3 py-2.5 font-medium">{b.currency}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">{fmt(b.balance)}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-text-muted">{fmt(b.locked)}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">{fmt(b.balance + b.locked)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <p className="mt-2 text-xs text-text-muted">Source: your CoinDCX account (read-only). Amounts only — not valued, not advice.</p>
    </div>
  );
}
