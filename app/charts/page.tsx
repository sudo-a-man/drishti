"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, Badge, Skeleton } from "@/components/ui";
import { gannSquare9 } from "@/lib/gann";
import PriceChart, { type Candle, type SRLine } from "@/components/PriceChart";
import { openingRange } from "@/lib/sim/indicator";
import { fairValueGaps, orderBlocks } from "@/lib/ict";
import { smc } from "@/lib/smc";
import { trendlines } from "@/lib/trendlines";
import { ifvg } from "@/lib/indicators/ifvg";
import { modelSignals } from "@/lib/indicators/mlSignals";
import { maCross } from "@/lib/indicators/maCross";
import { killzones, INDIA_SESSIONS, INDIA_TZ } from "@/lib/indicators/killzones";

const INDEXES = [
  { id: "nifty", label: "Nifty 50", symbol: "NSE:NIFTY50-INDEX" },
  { id: "banknifty", label: "Bank Nifty", symbol: "NSE:NIFTYBANK-INDEX" },
  { id: "sensex", label: "Sensex", symbol: "BSE:SENSEX-INDEX" },
];
const RESOS = [
  { id: "D", label: "1D" }, { id: "60", label: "1H" }, { id: "15", label: "15m" }, { id: "5", label: "5m" }, { id: "3", label: "3m" }, { id: "1", label: "1m" },
];
const fmt = (n?: number) => (n ? n.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—");

type OptStrike = { strike: number; ceSym: string; peSym: string };
type Opt = { spot: number; maxPain: number; pcr: number; callWall: number; putWall: number; strikes: OptStrike[] };
type View = { kind: "index" } | { kind: "strike"; sym: string; label: string };

export default function ChartsPage() {
  const [index, setIndex] = useState("sensex");
  const [res, setRes] = useState("15");
  const [opt, setOpt] = useState<Opt | null>(null);
  const [candles, setCandles] = useState<Candle[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<View>({ kind: "index" });
  const [overlay, setOverlay] = useState({ signal: false, fvg: false, ob: false, smc: true, trend: true, ifvg: false, killzones: false, model: false, macross: false });
  const [strikeSide, setStrikeSide] = useState<"CE" | "PE">("CE");
  const meta = INDEXES.find((i) => i.id === index)!;

  useEffect(() => {
    let on = true;
    setOpt(null);
    fetch(`/api/options?u=${index}`, { cache: "no-store" })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => { if (on && ok) setOpt(j); else if (on) setErr(j.error || "Failed to load option data"); })
      .catch(() => on && setErr("Failed to load option data"));
    return () => { on = false; };
  }, [index]);

  useEffect(() => {
    let on = true;
    setCandles(null);
    setErr(null);
    const symbol = view.kind === "index" ? meta.symbol : view.sym;
    const days = res === "D" ? 180 : res === "60" ? 30 : res === "1" ? 4 : res === "3" ? 7 : 10;
    fetch(`/api/history?symbol=${encodeURIComponent(symbol)}&res=${res}&days=${days}`, { cache: "no-store" })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => { if (!on) return; if (ok) setCandles(j.candles); else setErr(j.error || "Failed to load chart"); })
      .catch(() => on && setErr("Failed to load chart"));
    return () => { on = false; };
  }, [view, res, meta.symbol]);

  const lines: SRLine[] = useMemo(() => {
    const L: SRLine[] = [];
    if (view.kind === "index" && opt) {
      if (opt.callWall) L.push({ price: opt.callWall, color: "#ef4444", title: `Call wall ${opt.callWall}` });
      if (opt.putWall) L.push({ price: opt.putWall, color: "#22c55e", title: `Put wall ${opt.putWall}` });
      if (opt.maxPain) L.push({ price: opt.maxPain, color: "#a78bfa", title: `Max pain ${opt.maxPain}`, dashed: true });
      if (opt.spot) for (const g of gannSquare9(opt.spot)) if (g.degrees === 90 || g.degrees === 180) {
        L.push({ price: g.resistance, color: "rgba(239,68,68,0.35)", title: `Gann ${g.degrees}°`, dashed: true });
        L.push({ price: g.support, color: "rgba(34,197,94,0.35)", title: `Gann ${g.degrees}°`, dashed: true });
      }
    } else if (view.kind === "strike" && candles && candles.length) {
      const ref = candles[candles.length - 1].close;
      for (const g of gannSquare9(ref)) if (g.degrees === 45 || g.degrees === 90 || g.degrees === 180) {
        L.push({ price: g.resistance, color: "rgba(239,68,68,0.4)", title: `Gann ${g.degrees}°`, dashed: true });
        L.push({ price: g.support, color: "rgba(34,197,94,0.4)", title: `Gann ${g.degrees}°`, dashed: true });
      }
    }
    return L;
  }, [view, opt, candles]);

  const orStudy = useMemo(() => {
    if (!overlay.signal || !candles) return { levelLines: undefined, markers: undefined };
    const { markers, segments } = openingRange(candles);
    const seg = (s: { tStart: number; tEnd: number }, v: number, color: string, dashed?: boolean) => ({ color, dashed, points: [{ time: s.tStart, value: v }, { time: s.tEnd, value: v }] });
    const levelLines = segments.flatMap((s) => [
      seg(s, s.orHigh, "#eab308"), seg(s, s.orLow, "#eab308"),
      seg(s, s.pt1Up, "#d946ef", true), seg(s, s.pt1Low, "#d946ef", true),
      seg(s, s.pt2Up, "#22d3ee", true), seg(s, s.pt2Low, "#22d3ee", true),
    ]);
    return { levelLines, markers: markers.map((m) => ({ time: m.time, text: String(m.pt), up: m.up, color: m.up ? "#22c55e" : "#ef4444" })) };
  }, [overlay.signal, candles]);

  const modelData = useMemo(() => (candles && candles.length && overlay.model ? modelSignals(candles) : null), [candles, overlay.model]);

  const chartOverlays = useMemo(() => {
    const markers = [...(orStudy.markers ?? [])];
    const levelLines = [...(orStudy.levelLines ?? [])];
    const bx: { time: number; top: number; bottom: number; rgb: string }[] = [];
    const hl: { price: number; color: string; title: string; dashed?: boolean }[] = [];
    if (candles) {
      if (overlay.fvg) bx.push(...fairValueGaps(candles));
      if (overlay.ob) bx.push(...orderBlocks(candles));
      if (overlay.smc) {
        const s = smc(candles);
        markers.push(...s.markers);
        levelLines.push(...s.lines.map((l) => ({ color: l.color, dashed: l.dashed, points: [{ time: l.from, value: l.price }, { time: l.to, value: l.price }] })));
        bx.push(...s.boxes);
        hl.push(...s.hlines);
      }
      if (overlay.trend) {
        const t = trendlines(candles, res === "1" ? 21 : 14);
        levelLines.push(...t.lines.map((l) => ({ color: l.color, dashed: l.dashed, noScale: l.noScale, points: l.points })));
        markers.push(...t.markers);
      }
      if (overlay.ifvg) {
        const v = ifvg(candles);
        bx.push(...v.boxes);
        markers.push(...v.markers);
      }
      if (overlay.killzones && res !== "D") {
        const kz = killzones(candles, INDIA_SESSIONS, INDIA_TZ);
        levelLines.push(...kz.levelLines);
        markers.push(...kz.markers);
      }
      if (modelData) markers.push(...modelData.markers);
      if (overlay.macross) {
        const mc = maCross(candles);
        levelLines.push(...mc.levelLines);
        markers.push(...mc.markers);
      }
    }
    return { markers, levelLines, boxes: bx, hlines: hl };
  }, [orStudy, candles, res, overlay.fvg, overlay.ob, overlay.smc, overlay.trend, overlay.ifvg, overlay.killzones, modelData, overlay.macross]);

  const stats = [
    { label: "Spot", value: fmt(opt?.spot), cls: "text-text" },
    { label: "Max pain", value: fmt(opt?.maxPain), cls: "text-accent-text" },
    { label: "PCR", value: opt?.pcr ? String(opt.pcr) : "—", cls: "text-text" },
    { label: "Call wall", value: fmt(opt?.callWall), cls: "text-danger" },
    { label: "Put wall", value: fmt(opt?.putWall), cls: "text-success" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        <span className="text-xs font-semibold uppercase tracking-wider text-accent-text">Charts</span>
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Charts</h1>
      <p className="mb-6 mt-1.5 max-w-3xl text-text-muted">
        Candles with support and resistance from the option chain (call wall, put wall, max pain), plus Gann levels, volume bubbles and liquidity-zone boxes. Toggle Range for the opening-range study (OR high/low plus PT1/PT2 target bands). Open any strike to chart its premium. A mechanical study, not advice.
      </p>
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
          <div className="flex gap-1">
            {INDEXES.map((i) => (
              <button key={i.id} onClick={() => { setIndex(i.id); setView({ kind: "index" }); }} className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${index === i.id ? "bg-surface-3 text-text" : "text-text-muted hover:text-text"}`}>{i.label}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-border p-0.5">
              {RESOS.map((r) => (
                <button key={r.id} onClick={() => setRes(r.id)} className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${res === r.id ? "bg-grad-accent text-on-accent" : "text-text-muted hover:text-text"}`}>{r.label}</button>
              ))}
            </div>
            <button onClick={() => setOverlay((o) => ({ ...o, signal: !o.signal }))} className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${overlay.signal ? "border-border-strong text-text" : "border-border text-text-faint"}`}>Range</button>
            <button onClick={() => setOverlay((o) => ({ ...o, fvg: !o.fvg }))} className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${overlay.fvg ? "border-border-strong text-text" : "border-border text-text-faint"}`}>FVG</button>
            <button onClick={() => setOverlay((o) => ({ ...o, ob: !o.ob }))} className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${overlay.ob ? "border-border-strong text-text" : "border-border text-text-faint"}`}>OB</button>
            <button onClick={() => setOverlay((o) => ({ ...o, smc: !o.smc }))} className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${overlay.smc ? "border-border-strong text-text" : "border-border text-text-faint"}`}>SMC</button>
            <button onClick={() => setOverlay((o) => ({ ...o, trend: !o.trend }))} className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${overlay.trend ? "border-border-strong text-text" : "border-border text-text-faint"}`}>Trend</button>
            <button onClick={() => setOverlay((o) => ({ ...o, ifvg: !o.ifvg }))} className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${overlay.ifvg ? "border-border-strong text-text" : "border-border text-text-faint"}`}>IFVG</button>
            <button onClick={() => setOverlay((o) => ({ ...o, model: !o.model }))} className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${overlay.model ? "border-border-strong text-text" : "border-border text-text-faint"}`}>AI/ML</button>
            <button onClick={() => setOverlay((o) => ({ ...o, macross: !o.macross }))} className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${overlay.macross ? "border-border-strong text-text" : "border-border text-text-faint"}`}>MA✕</button>
            <button onClick={() => setOverlay((o) => ({ ...o, killzones: !o.killzones }))} className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${overlay.killzones ? "border-border-strong text-text" : "border-border text-text-faint"}`}>Sessions</button>
          </div>
        </div>
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm">
          <Badge tone="accent">{view.kind === "index" ? meta.label : view.label}</Badge>
          {view.kind === "strike" && <button onClick={() => setView({ kind: "index" })} className="text-xs text-text-muted hover:text-text">back to index</button>}
        </div>
        <div className="grid grid-cols-2 divide-x divide-border border-b border-border sm:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-wider text-text-faint">{s.label}</div>
              <div className={`font-mono text-sm font-semibold tabular-nums ${s.cls}`}>{s.value}</div>
            </div>
          ))}
        </div>
        <div className="p-3">
          {err && <div className="mb-3 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{err}</div>}
          {candles ? <PriceChart candles={candles} lines={lines} showBubbles={false} showZones={false} markers={chartOverlays.markers} levelLines={chartOverlays.levelLines} boxes={chartOverlays.boxes} /> : <Skeleton className="h-[440px] w-full" />}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-3 py-2.5 text-xs text-text-muted">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-danger" /> call wall</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-success" /> put wall</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm" style={{ background: "#a78bfa" }} /> max pain</span>
          <span>dashed = Gann</span>
          <span>BOS / CHoCH + HH/HL/LH/LL = SMC structure</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm" style={{ background: "rgba(242,54,69,0.3)" }} /> premium / <span className="h-2 w-3 rounded-sm" style={{ background: "rgba(8,153,129,0.3)" }} /> discount zone</span>
          <span>dashed = internal structure &amp; EQH/EQL</span>
          <span>strong / weak high-low</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm" style={{ background: "#089981" }} /> trendlines + B breakouts</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm" style={{ background: "#eab308" }} /> opening range · PT1/PT2 target bands · 1/2 = target hit</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm" style={{ background: "rgba(6,182,212,0.55)" }} /> FVG (cyan up / orange down)</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm" style={{ background: "rgba(62,137,250,0.55)" }} /> order block (blue up / red down)</span>
        </div>
      </Card>
      {overlay.model && (
        <p className="mt-2 text-xs text-warning">
          {modelData && modelData.testAcc != null
            ? `AI/ML model: logistic regression on price features, scored out-of-sample at ≈ ${Math.round(modelData.testAcc * 100)}% on this data. Experimental — near a coin-flip, not advice.`
            : "AI/ML model: not enough candles to train on this timeframe — try a lower interval."}
        </p>
      )}
      {opt && opt.strikes.length > 0 && (
        <Card className="mt-4 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Open a strike chart</h2>
            <div className="flex rounded-lg border border-border p-0.5">
              {(["CE", "PE"] as const).map((sd) => (
                <button key={sd} onClick={() => setStrikeSide(sd)} className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${strikeSide === sd ? "bg-surface-3 text-text" : "text-text-muted hover:text-text"}`}>{sd}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {opt.strikes.map((s) => {
              const sym = strikeSide === "CE" ? s.ceSym : s.peSym;
              if (!sym) return null;
              const active = view.kind === "strike" && view.sym === sym;
              return (
                <button key={s.strike} onClick={() => setView({ kind: "strike", sym, label: `${s.strike} ${strikeSide}` })} className={`shrink-0 rounded-md border px-2.5 py-1.5 font-mono text-xs tabular-nums transition-colors ${active ? "border-accent bg-surface-3 text-text" : "border-border text-text-muted hover:border-border-strong hover:text-text"}`}>{s.strike}</button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-text-faint">Strike charts plot the option premium over time, with Gann levels, bubbles and zones computed on the premium.</p>
        </Card>
      )}
    </div>
  );
}
