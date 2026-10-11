"use client";
import { useEffect, useState } from "react";
import { Tabs, Card, Skeleton, RatingMeter, SignalPill } from "@/components/ui";

const TABS = [
  { id: "USDT", label: "USDT pairs" },
  { id: "INR", label: "INR pairs" },
];
type Row = {
  rank: number; market: string; base: string; last: number; changePct: number;
  high: number; low: number; volume: number; rating: number; signal: "buy" | "sell" | "hold";
};
type Data = { quote: string; rows: Row[]; updatedAt: number };

export default function CryptoPage() {
  const [quote, setQuote] = useState("USDT");
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let on = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/crypto?quote=${quote}`, { cache: "no-store" });
        if (!r.ok) throw new Error();
        const j = (await r.json()) as Data;
        if (on) { setData(j); setErr(false); }
      } catch {
        if (on) setErr(true);
      }
    };
    setData(null);
    load();
    const id = setInterval(load, 15000);
    return () => { on = false; clearInterval(id); };
  }, [quote]);

  const fmtPrice = (n: number) => {
    if (!n) return "—";
    const sym = quote === "INR" ? "₹" : "$";
    const d = n >= 100 ? 2 : n >= 1 ? 3 : 6;
    return sym + n.toLocaleString(quote === "INR" ? "en-IN" : "en-US", { maximumFractionDigits: d });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        <span className="text-xs font-semibold uppercase tracking-wider text-accent-text">Crypto</span>
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Crypto market</h1>
      <p className="mb-3 mt-1.5 max-w-2xl text-text-muted">
        Live spot prices from CoinDCX, ranked by 24-hour traded volume. The meter is a simple read of the 24h move — analytics, not advice.
      </p>
      <a href="/crypto/charts" className="mb-6 inline-block text-sm text-accent-text hover:underline">Open candlestick charts — gold (XAU) &amp; majors →</a>

      <div className="flex items-center justify-between gap-3">
        <Tabs tabs={TABS} value={quote} onChange={setQuote} />
        <div className="flex shrink-0 items-center gap-2 pb-2">
          <span className="h-2 w-2 animate-pulsering rounded-full bg-success" />
          <span className="font-mono text-xs text-text-faint">LIVE · 15s</span>
        </div>
      </div>

      {err && <Card className="mt-4 p-4 text-sm text-danger">Couldn&apos;t load CoinDCX right now. Retrying…</Card>}

      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2/40 text-left text-xs uppercase tracking-wider text-text-faint">
              <th scope="col" className="px-3 py-2.5 font-semibold">#</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Coin</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Price</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">24h</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Meter</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Signal</th>
            </tr>
          </thead>
          <tbody>
            {!data && !err && Array.from({ length: 10 }).map((_, i) => (
              <tr key={i} className="border-t border-border"><td colSpan={6} className="px-3 py-2.5"><Skeleton className="h-5 w-full" /></td></tr>
            ))}
            {data && data.rows.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-text-muted">No markets found.</td></tr>
            )}
            {data && data.rows.map((r) => (
              <tr key={r.market} className="border-t border-border transition-colors hover:bg-surface-2">
                <td className="px-3 py-2.5 font-mono text-text-muted">{r.rank}</td>
                <td className="px-3 py-2.5 font-medium">{r.base}<div className="text-xs font-normal text-text-muted">{r.base}/{quote}</div></td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">{fmtPrice(r.last)}</td>
                <td className={`px-3 py-2.5 text-right font-mono tabular-nums ${r.changePct >= 0 ? "text-success" : "text-danger"}`}>{r.changePct >= 0 ? "+" : ""}{r.changePct}%</td>
                <td className="px-3 py-2.5"><RatingMeter rating={r.rating} golden={Math.abs(r.rating) > 70} /></td>
                <td className="px-3 py-2.5"><SignalPill signal={r.signal} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-text-muted">
        Source: CoinDCX public market data. Crypto trades 24/7 and is highly volatile. Analytics for education only, not investment advice.
      </p>
    </div>
  );
}
