"use client";
import { useEffect, useState } from "react";
import { RatingMeter, SignalPill, Skeleton } from "./ui";

type Side = "bull" | "bear";
type Row = {
  symbol: string; name: string; sector: string; ltp: number; changePct: number;
  rating: number; signal: "buy" | "sell" | "hold"; goldenZone: boolean; rank: number; prevRank: number;
};
type Sector = { sector: string; avgStrength: number; leading: boolean };
type Payload = { rows: Row[]; sectors: Sector[]; breadth: { bull: number; bear: number } };

export default function Terminal() {
  const [side, setSide] = useState<Side>("bull");
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/board?side=${side}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as Payload;
        if (alive) { setData(json); setError(false); }
      } catch {
        if (alive) setError(true);
      }
    };
    setData(null);
    load();
    const id = setInterval(load, 15000);
    return () => { alive = false; clearInterval(id); };
  }, [side]);

  const total = data ? data.breadth.bull + data.breadth.bear || 1 : 1;
  const bullPct = Math.round(((data?.breadth.bull ?? 0) / total) * 100);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
          <div className="flex rounded-lg border border-border p-0.5">
            {([{ id: "bull", label: "Bullish" }, { id: "bear", label: "Bearish" }] as const).map((t) => (
              <button key={t.id} onClick={() => setSide(t.id)} className={`rounded-md px-3.5 py-1 text-sm font-semibold transition-colors ${side === t.id ? "bg-surface-3 text-text" : "text-text-muted hover:text-text"}`}>{t.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulsering rounded-full bg-success" />
            <span className="font-mono text-xs text-text-faint">LIVE · updates 15s</span>
          </div>
        </div>

        <div className="border-b border-border px-3 py-2.5">
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-success">{data?.breadth.bull ?? 0} advancing</span>
            <span className="text-text-faint">breadth {data ? `${bullPct}%` : "—"}</span>
            <span className="text-danger">{data?.breadth.bear ?? 0} declining</span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-pill bg-surface-2">
            <div className="h-full bg-success transition-all duration-500" style={{ width: `${((data?.breadth.bull ?? 0) / total) * 100}%` }} />
            <div className="h-full bg-danger transition-all duration-500" style={{ width: `${((data?.breadth.bear ?? 0) / total) * 100}%` }} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2/40 text-left text-xs uppercase tracking-wider text-text-faint">
                <th scope="col" className="px-3 py-2.5 font-semibold">#</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Symbol</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">LTP</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Chg%</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Meter</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Signal</th>
              </tr>
            </thead>
            <tbody>
              {!data && !error && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-t border-border"><td colSpan={6} className="px-3 py-2.5"><Skeleton className="h-5 w-full" /></td></tr>
              ))}
              {error && <tr><td colSpan={6} className="px-3 py-8 text-center text-danger">Couldn&apos;t load the board. Retrying…</td></tr>}
              {data && data.rows.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-text-muted">No {side} setups right now.</td></tr>
              )}
              {data && data.rows.map((r) => {
                const moved = r.prevRank - r.rank;
                return (
                  <tr key={r.symbol} className="border-t border-border transition-colors hover:bg-surface-2">
                    <td className="px-3 py-2.5 font-mono text-text-muted">{r.rank}{moved !== 0 && <span className={moved > 0 ? "text-success" : "text-danger"} aria-label={moved > 0 ? "up" : "down"}>{moved > 0 ? " ▲" : " ▼"}</span>}</td>
                    <td className="px-3 py-2.5 font-medium">{r.symbol}<div className="text-xs font-normal text-text-muted">{r.sector}</div></td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">{r.ltp.toLocaleString("en-IN")}</td>
                    <td className={`px-3 py-2.5 text-right font-mono tabular-nums ${r.changePct >= 0 ? "text-success" : "text-danger"}`}>{r.changePct >= 0 ? "+" : ""}{r.changePct}%</td>
                    <td className="px-3 py-2.5"><RatingMeter rating={r.rating} golden={r.goldenZone} /></td>
                    <td className="px-3 py-2.5"><SignalPill signal={r.signal} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 lg:h-fit">
        <h2 className="text-sm font-semibold">Sector flow</h2>
        <ul className="flex flex-col gap-2.5">
          {!data && Array.from({ length: 6 }).map((_, i) => <li key={i}><Skeleton className="h-6 w-full" /></li>)}
          {data && data.sectors.map((s) => {
            const w = Math.min(100, Math.abs(s.avgStrength));
            return (
              <li key={s.sector} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className={s.leading ? "font-medium text-text" : "text-text-muted"}>{s.sector}{s.leading && <span className="text-accent-text"> ★</span>}</span>
                  <span className={`font-mono text-xs tabular-nums ${s.avgStrength >= 0 ? "text-success" : "text-danger"}`}>{s.avgStrength > 0 ? "+" : ""}{s.avgStrength}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-pill bg-surface-2">
                  <div className={`h-full rounded-pill ${s.avgStrength >= 0 ? "bg-success" : "bg-danger"}`} style={{ width: `${w}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}
