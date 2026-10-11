"use client";
import { useEffect, useState } from "react";
import { Tabs, Card, Badge, Skeleton } from "@/components/ui";

const TABS = [
  { id: "nifty", label: "Nifty 50" },
  { id: "banknifty", label: "Bank Nifty" },
  { id: "sensex", label: "Sensex" },
];
type Strike = { strike: number; ceOI: number; peOI: number; ceLTP: number; peLTP: number };
type Data = { label: string; spot: number; expiry: string; maxPain: number; pcr: number; callWall: number; putWall: number; strikes: Strike[] };

export default function OptionsPage() {
  const [u, setU] = useState("nifty");
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let on = true;
    setData(null);
    setErr(null);
    fetch(`/api/options?u=${u}`, { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json();
        if (!on) return;
        if (!r.ok) setErr(j.error || "Failed to load");
        else setData(j);
      })
      .catch(() => on && setErr("Failed to load"));
    return () => { on = false; };
  }, [u]);

  const fmt = (n: number) => (n ? n.toLocaleString("en-IN") : "—");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        <span className="text-xs font-semibold uppercase tracking-wider text-accent-text">Options</span>
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Max pain &amp; option flow</h1>
      <p className="mb-6 mt-1.5 max-w-2xl text-text-muted">
        Open-interest view per index. Max pain is the strike where option writers pay out the least. Analytics, not advice.
      </p>
      <Tabs tabs={TABS} value={u} onChange={setU} />

      {err && <Card className="mt-4 p-4 text-sm text-danger">{err}</Card>}
      {!data && !err && (
        <div className="mt-4 flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
        </div>
      )}

      {data && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Card className="p-4"><div className="text-xs text-text-muted">Spot</div><div className="font-mono text-lg">{fmt(data.spot)}</div></Card>
            <Card className="p-4"><div className="text-xs text-text-muted">Max pain</div><div className="font-mono text-lg text-accent-text">{fmt(data.maxPain)}</div></Card>
            <Card className="p-4"><div className="text-xs text-text-muted">PCR</div><div className="font-mono text-lg">{data.pcr || "—"}</div></Card>
          </div>
          <p className="mt-2 text-xs text-text-muted">Expiry: {data.expiry || "nearest"}</p>
          <p className="mt-1 text-xs text-text-muted">
            Resistance wall (top call OI): <span className="text-danger">{fmt(data.callWall)}</span>
            {" · "}Support wall (top put OI): <span className="text-success">{fmt(data.putWall)}</span>
          </p>

          <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-muted">
                  <th scope="col" className="px-3 py-2 font-semibold">Call OI</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Call LTP</th>
                  <th scope="col" className="px-3 py-2 text-center font-semibold">Strike</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Put LTP</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Put OI</th>
                </tr>
              </thead>
              <tbody>
                {data.strikes.map((s) => {
                  const prem = (n: number) => (n ? n.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—");
                  const ceTV = s.ceLTP ? Math.max(0, Math.round(s.ceLTP - Math.max(data.spot - s.strike, 0))) : 0;
                  const peTV = s.peLTP ? Math.max(0, Math.round(s.peLTP - Math.max(s.strike - data.spot, 0))) : 0;
                  return (
                  <tr key={s.strike} className={`border-t border-border ${s.strike === data.maxPain ? "bg-surface-2" : ""}`}>
                    <td className="px-3 py-2 font-mono tabular-nums">{fmt(s.ceOI)}</td>
                    <td className="px-3 py-2 font-mono tabular-nums">
                      {prem(s.ceLTP)}
                      {s.ceLTP ? <span className="ml-1 text-[10px] text-text-muted">tv {ceTV}</span> : null}
                    </td>
                    <td className="px-3 py-2 text-center font-medium">
                      {s.strike}
                      {s.strike === data.maxPain && <span className="ml-1"><Badge tone="accent">max pain</Badge></span>}
                      {s.strike === data.callWall && <span className="ml-1"><Badge tone="sell">resistance</Badge></span>}
                      {s.strike === data.putWall && <span className="ml-1"><Badge tone="buy">support</Badge></span>}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {prem(s.peLTP)}
                      {s.peLTP ? <span className="ml-1 text-[10px] text-text-muted">tv {peTV}</span> : null}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{fmt(s.peOI)}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            LTP = current premium. &quot;tv&quot; = time value (premium minus intrinsic value) — the part that decays to zero by expiry. Deep out-of-the-money strikes look cheap (₹1–₹2) because they are almost entirely time value with a low chance of paying off; the rare one that jumps to ₹50 is funded by the many that expire worthless. This is analytics, not advice.
          </p>
        </>
      )}
    </div>
  );
}
