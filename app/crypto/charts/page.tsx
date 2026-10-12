"use client";
import { useEffect, useMemo, useState } from "react";
import PriceChart, { type Candle, type SRLine, type Marker, type LevelLine } from "@/components/PriceChart";
import { Card, Skeleton } from "@/components/ui";
import { gannSquare9 } from "@/lib/gann";
import { smc } from "@/lib/smc";
import { trendlines } from "@/lib/trendlines";
import { ifvg } from "@/lib/indicators/ifvg";
import { killzones, ICT_SESSIONS, ICT_TZ } from "@/lib/indicators/killzones";
import { hsn } from "@/lib/indicators/hsn";

const SYMBOLS = [
  { id: "B-XAUT_USDT", label: "Gold · XAUT / USDT" },
  { id: "B-BTC_USDT", label: "BTC / USDT" },
  { id: "I-XAUT_INR", label: "Gold · XAUT / INR" },
  { id: "B-PAXG_USDT", label: "Gold · PAXG / USDT" },
  { id: "B-ETH_USDT", label: "ETH / USDT" },
  { id: "B-SOL_USDT", label: "SOL / USDT" },
];
const INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1d", "1w"];
const INTRADAY = ["1m", "5m", "15m", "1h"];
const TOGGLES = [
  { k: "smc", label: "SMC" }, { k: "trend", label: "Trend" }, { k: "hsn", label: "HSN" }, { k: "ifvg", label: "IFVG" },
  { k: "killzones", label: "Killzones" }, { k: "gann", label: "Gann" }, { k: "zones", label: "Zones" }, { k: "bubbles", label: "Vol" },
] as const;

export default function CryptoChartsPage() {
  const [pair, setPair] = useState("B-XAUT_USDT");
  const [tf, setTf] = useState("1d");
  const [candles, setCandles] = useState<Candle[] | null>(null);
  const [err, setErr] = useState(false);
  const [ov, setOv] = useState({ smc: true, trend: true, hsn: false, ifvg: false, killzones: false, gann: false, zones: false, bubbles: false });

  useEffect(() => {
    let on = true; setCandles(null); setErr(false);
    fetch(`/api/crypto/candles?pair=${pair}&interval=${tf}&limit=400`, { cache: "no-store" })
      .then(async (r) => { if (!r.ok) throw new Error(); const j = await r.json(); if (on) setCandles(j.candles ?? []); })
      .catch(() => on && setErr(true));
    return () => { on = false; };
  }, [pair, tf]);

  const smcData = useMemo(() => (candles && candles.length && ov.smc ? smc(candles) : null), [candles, ov.smc]);
  const trendData = useMemo(() => (candles && candles.length && ov.trend ? trendlines(candles, tf === "1m" ? 21 : 14) : null), [candles, ov.trend, tf]);
  const ifvgData = useMemo(() => (candles && candles.length && ov.ifvg ? ifvg(candles) : null), [candles, ov.ifvg]);
  const kzData = useMemo(() => (candles && candles.length && ov.killzones && INTRADAY.includes(tf) ? killzones(candles, ICT_SESSIONS, ICT_TZ) : null), [candles, ov.killzones, tf]);
  const hsnData = useMemo(() => (candles && candles.length && ov.hsn ? hsn(candles) : null), [candles, ov.hsn]);

  const lines = useMemo<SRLine[]>(() => {
    const L: SRLine[] = [];
    if (candles && candles.length && ov.gann) {
      const ref = candles[candles.length - 1].close;
      for (const g of gannSquare9(ref)) if (g.degrees === 45 || g.degrees === 90 || g.degrees === 180) {
        L.push({ price: g.resistance, color: "rgba(239,68,68,0.4)", title: `Gann ${g.degrees}°`, dashed: true });
        L.push({ price: g.support, color: "rgba(34,197,94,0.4)", title: `Gann ${g.degrees}°`, dashed: true });
      }
    }
    if (smcData) for (const h of smcData.hlines) L.push({ price: h.price, color: h.color, title: h.title, dashed: h.dashed });
    if (hsnData) for (const h of hsnData.hlines) L.push({ price: h.price, color: h.color, title: h.title, dashed: h.dashed });
    return L;
  }, [candles, ov.gann, smcData, hsnData]);

  const markers = useMemo<Marker[]>(() => {
    const m: Marker[] = [];
    if (smcData) m.push(...smcData.markers);
    if (trendData) m.push(...trendData.markers);
    if (ifvgData) m.push(...ifvgData.markers);
    if (kzData) m.push(...kzData.markers);
    if (hsnData) m.push(...hsnData.markers);
    return m;
  }, [smcData, trendData, ifvgData, kzData, hsnData]);

  const levelLines = useMemo<LevelLine[]>(() => {
    const ll: LevelLine[] = [];
    if (smcData) ll.push(...smcData.lines.map((l) => ({ color: l.color, dashed: l.dashed, points: [{ time: l.from, value: l.price }, { time: l.to, value: l.price }] })));
    if (trendData) ll.push(...trendData.lines.map((l) => ({ color: l.color, dashed: l.dashed, noScale: l.noScale, points: l.points })));
    if (kzData) ll.push(...kzData.levelLines);
    if (hsnData) ll.push(...hsnData.levelLines);
    return ll;
  }, [smcData, trendData, kzData, hsnData]);

  const boxes = useMemo(() => {
    const bx: { time: number; top: number; bottom: number; rgb: string }[] = [];
    if (candles && candles.length) {
      if (ifvgData) bx.push(...ifvgData.boxes);
      if (smcData) bx.push(...smcData.boxes);
      if (hsnData) bx.push(...hsnData.boxes);
    }
    return bx;
  }, [candles, ifvgData, smcData, hsnData]);

  const last = candles && candles.length ? candles[candles.length - 1] : null;
  const first = candles && candles.length ? candles[0] : null;
  const chg = last && first && first.close ? ((last.close - first.close) / first.close) * 100 : 0;
  const sym = SYMBOLS.find((s) => s.id === pair)?.label ?? pair;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        <span className="text-xs font-semibold uppercase tracking-wider text-accent-text">Crypto · Charts</span>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Crypto charts</h1>
          <p className="mt-1.5 max-w-3xl text-text-muted">CoinDCX candles with SMC, trendlines, an AI/ML signal, inversion FVGs, killzones, FVG, order blocks, Gann and zones. Gold (XAUT/PAXG) &amp; majors. Analytics, not advice.</p>
        </div>
        <a href="/crypto" className="text-sm text-accent-text hover:underline">← Market board</a>
      </div>

      <Card className="mt-4 overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
          <select value={pair} onChange={(e) => setPair(e.target.value)} aria-label="Pair" className="h-9 rounded-md border border-border-input bg-surface px-3 text-sm text-text">
            {SYMBOLS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-border p-0.5">
              {INTERVALS.map((r) => (
                <button key={r} onClick={() => setTf(r)} className={`rounded-md px-2.5 py-1 text-xs font-semibold uppercase transition-colors ${tf === r ? "bg-grad-accent text-on-accent" : "text-text-muted hover:text-text"}`}>{r}</button>
              ))}
            </div>
            {TOGGLES.map((t) => (
              <button key={t.k} onClick={() => setOv((o) => ({ ...o, [t.k]: !o[t.k] }))} className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${ov[t.k] ? "border-border-strong text-text" : "border-border text-text-faint"}`}>{t.label}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between border-b border-border px-3 py-2 text-sm">
          <span className="font-display font-semibold">{sym}</span>
          {last && <span className="flex items-center gap-3 font-mono tabular-nums"><span>{last.close.toLocaleString()}</span><span className={chg >= 0 ? "text-success" : "text-danger"}>{chg >= 0 ? "+" : ""}{chg.toFixed(2)}%</span></span>}
        </div>
        <div className="p-3">
          {err && <div className="mb-3 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">Couldn&apos;t load candles for this pair.</div>}
          {candles && candles.length > 0 ? (
            <PriceChart candles={candles} lines={lines} showBubbles={ov.bubbles} showZones={ov.zones} markers={markers} levelLines={levelLines} boxes={boxes} />
          ) : !err ? <Skeleton className="h-[440px] w-full" /> : null}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-3 py-2.5 text-xs text-text-muted">
          <span>SMC · Trendlines · HSN Buy/Sell + supply/demand · IFVG · Killzones · dashed = Gann · axis IST · CoinDCX</span>
        </div>
      </Card>
      <p className="mt-2 text-xs text-text-muted">&quot;XAU&quot; = tokenized gold (XAUT / PAXG). Mechanical studies — not advice.</p>
    </div>
  );
}
