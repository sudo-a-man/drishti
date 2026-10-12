"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, Badge, Skeleton } from "@/components/ui";
import { gannSquare9 } from "@/lib/gann";
import PriceChart, { type Candle, type SRLine } from "@/components/PriceChart";
import { openingRange } from "@/lib/sim/indicator";
import { smc } from "@/lib/smc";
import { trendlines } from "@/lib/trendlines";
import { ifvg } from "@/lib/indicators/ifvg";
import { hsn } from "@/lib/indicators/hsn";
import { killzones, INDIA_SESSIONS, INDIA_TZ } from "@/lib/indicators/killzones";
import { levelSignals, type SigLevel } from "@/lib/indicators/levelSignals";

const INDEXES = [
  { id: "nifty", label: "Nifty 50", symbol: "NSE:NIFTY50-INDEX" },
  { id: "banknifty", label: "Bank Nifty", symbol: "NSE:NIFTYBANK-INDEX" },
  { id: "sensex", label: "Sensex", symbol: "BSE:SENSEX-INDEX" },
];
const RESOS = [
  { id: "D", label: "1D" }, { id: "60", label: "1H" }, { id: "15", label: "15m" }, { id: "5", label: "5m" }, { id: "3", label: "3m" }, { id: "1", label: "1m" },
];
const fmt = (n?: number) => (n ? n.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—");

// NSE cash/F&O session in IST (Mon–Fri, 09:15–15:30) — gates the live option-chain refresh.
function marketOpenIST(): boolean {
  const ist = new Date(Date.now() + 19800000); // shift so the UTC fields read as IST wall-clock
  const day = ist.getUTCDay();
  if (day === 0 || day === 6) return false;
  const min = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return min >= 9 * 60 + 15 && min <= 15 * 60 + 30;
}

type OptStrike = { strike: number; ceSym: string; peSym: string; ceLTP: number; peLTP: number; ceOICh: number; peOICh: number };
type Opt = { spot: number; maxPain: number; pcr: number; callWall: number; putWall: number; callWallForming: number; putWallForming: number; vix: number; strikes: OptStrike[] };
type View = { kind: "index" } | { kind: "strike"; sym: string; label: string };

export default function ChartsPage() {
  const [index, setIndex] = useState("sensex");
  const [res, setRes] = useState("15");
  const [opt, setOpt] = useState<Opt | null>(null);
  const [candles, setCandles] = useState<Candle[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<View>({ kind: "index" });
  const [overlay, setOverlay] = useState({ signal: false, smc: true, trend: true, ifvg: false, killzones: false, hsn: false, breaks: false });
  const [strikeSide, setStrikeSide] = useState<"CE" | "PE">("CE");
  const meta = INDEXES.find((i) => i.id === index)!;

  useEffect(() => {
    let on = true;
    const load = (initial: boolean) => {
      if (initial) setOpt(null);
      fetch(`/api/options?u=${index}`, { cache: "no-store" })
        .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
        .then(({ ok, j }) => { if (!on) return; if (ok) setOpt(j); else if (initial) setErr(j.error || "Failed to load option data"); })
        .catch(() => { if (on && initial) setErr("Failed to load option data"); });
    };
    load(true);
    // Refresh the chain through the live session so forming walls / OI move during market hours.
    const id = setInterval(() => { if (document.visibilityState === "visible" && marketOpenIST()) load(false); }, 75000);
    return () => { on = false; clearInterval(id); };
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
      if (opt.callWallForming && opt.callWallForming !== opt.callWall) L.push({ price: opt.callWallForming, color: "#f59e0b", title: `Call wall forming ${opt.callWallForming}`, dashed: true });
      if (opt.putWallForming && opt.putWallForming !== opt.putWall) L.push({ price: opt.putWallForming, color: "#84cc16", title: `Put wall forming ${opt.putWallForming}`, dashed: true });
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
    const recent = segments.slice(-3); // only the last few sessions, so the bands stay readable
    const minT = recent.length ? recent[0].tStart : Infinity;
    const seg = (s: { tStart: number; tEnd: number }, v: number, color: string, dashed?: boolean) => ({ color, dashed, width: 1, points: [{ time: s.tStart, value: v }, { time: s.tEnd, value: v }] });
    const levelLines = recent.flatMap((s) => [
      seg(s, s.orHigh, "#eab308"), seg(s, s.orLow, "#eab308"),
      seg(s, s.pt1Up, "#d946ef", true), seg(s, s.pt1Low, "#d946ef", true),
      seg(s, s.pt2Up, "#22d3ee", true), seg(s, s.pt2Low, "#22d3ee", true),
    ]);
    return { levelLines, markers: markers.filter((m) => m.time >= minT).map((m) => ({ time: m.time, text: String(m.pt), up: m.up, color: m.up ? "#22c55e" : "#ef4444" })) };
  }, [overlay.signal, candles]);

  const hsnData = useMemo(() => (candles && candles.length && overlay.hsn ? hsn(candles) : null), [candles, overlay.hsn]);

  // Break/touch signals on the opening-range and session highs/lows, graded by OI on the index view.
  const breakSignals = useMemo(() => {
    if (!overlay.breaks || !candles || !candles.length) return null;
    const levels: SigLevel[] = [];
    for (const s of openingRange(candles).segments.slice(-3)) {
      levels.push({ price: s.orHigh, kind: "high", from: s.tStart, to: s.tEnd, label: "OR" });
      levels.push({ price: s.orLow, kind: "low", from: s.tStart, to: s.tEnd, label: "OR" });
    }
    if (res !== "D") {
      for (const z of killzones(candles, INDIA_SESSIONS, INDIA_TZ).instances) {
        levels.push({ price: z.hi, kind: "high", from: z.start, to: z.end + 3 * 3600, label: z.name.slice(0, 3) });
        levels.push({ price: z.lo, kind: "low", from: z.start, to: z.end + 3 * 3600, label: z.name.slice(0, 3) });
      }
    }
    const oi = view.kind === "index" && opt ? { strikes: opt.strikes.map((s) => ({ strike: s.strike, ceOICh: s.ceOICh, peOICh: s.peOICh })) } : null;
    return levelSignals(candles, levels, oi);
  }, [overlay.breaks, candles, res, view, opt]);

  // Strike nearest spot = at-the-money, for a visual marker on the strike rail.
  const atmStrike = useMemo(() => {
    if (!opt || !opt.spot || !opt.strikes.length) return null;
    return opt.strikes.reduce((b, s) => (Math.abs(s.strike - opt.spot) < Math.abs(b - opt.spot) ? s.strike : b), opt.strikes[0].strike);
  }, [opt]);

  // Flip CE/PE; if a strike chart is already open, re-open the same strike on the new side.
  const switchSide = (sd: "CE" | "PE") => {
    setStrikeSide(sd);
    if (view.kind === "strike" && opt) {
      const cur = opt.strikes.find((s) => s.ceSym === view.sym || s.peSym === view.sym);
      const sym = cur && (sd === "CE" ? cur.ceSym : cur.peSym);
      if (cur && sym) setView({ kind: "strike", sym, label: `${cur.strike} ${sd}` });
    }
  };

  const chartOverlays = useMemo(() => {
    const markers = [...(orStudy.markers ?? [])];
    const levelLines: { color: string; dashed?: boolean; noScale?: boolean; width?: number; points: { time: number; value?: number }[] }[] = [...(orStudy.levelLines ?? [])];
    const bx: { time: number; top: number; bottom: number; rgb: string }[] = [];
    const hl: { price: number; color: string; title: string; dashed?: boolean }[] = [];
    if (candles) {
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
        levelLines.push(...kz.levelLines.map((l) => ({ ...l, width: 1 })));
        markers.push(...kz.markers);
      }
      if (hsnData) {
        markers.push(...hsnData.markers);
        levelLines.push(...hsnData.levelLines);
        bx.push(...hsnData.boxes);
      }
      if (breakSignals) markers.push(...breakSignals);
    }
    return { markers, levelLines, boxes: bx, hlines: hl };
  }, [orStudy, candles, res, overlay.smc, overlay.trend, overlay.ifvg, overlay.killzones, hsnData, breakSignals]);

  const stats = [
    { label: "Spot", value: fmt(opt?.spot), cls: "text-text" },
    { label: "Max pain", value: fmt(opt?.maxPain), cls: "text-accent-text" },
    { label: "PCR", value: opt?.pcr ? String(opt.pcr) : "—", cls: "text-text" },
    { label: "Call wall", value: fmt(opt?.callWall), cls: "text-danger" },
    { label: "Put wall", value: fmt(opt?.putWall), cls: "text-success" },
    { label: "Call forming", value: fmt(opt?.callWallForming), cls: "text-warning" },
    { label: "Put forming", value: fmt(opt?.putWallForming), cls: "text-success" },
    { label: "India VIX", value: opt?.vix ? opt.vix.toFixed(2) : "—", cls: "text-text" },
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
            <button onClick={() => setOverlay((o) => ({ ...o, smc: !o.smc }))} className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${overlay.smc ? "border-border-strong text-text" : "border-border text-text-faint"}`}>SMC</button>
            <button onClick={() => setOverlay((o) => ({ ...o, trend: !o.trend }))} className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${overlay.trend ? "border-border-strong text-text" : "border-border text-text-faint"}`}>Trend</button>
            <button onClick={() => setOverlay((o) => ({ ...o, ifvg: !o.ifvg }))} className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${overlay.ifvg ? "border-border-strong text-text" : "border-border text-text-faint"}`}>IFVG</button>
            <button onClick={() => setOverlay((o) => ({ ...o, hsn: !o.hsn }))} className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${overlay.hsn ? "border-border-strong text-text" : "border-border text-text-faint"}`}>HSN</button>
            <button onClick={() => setOverlay((o) => ({ ...o, killzones: !o.killzones }))} className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${overlay.killzones ? "border-border-strong text-text" : "border-border text-text-faint"}`}>Sessions</button>
            <button onClick={() => setOverlay((o) => ({ ...o, breaks: !o.breaks }))} className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${overlay.breaks ? "border-border-strong text-text" : "border-border text-text-faint"}`}>Breaks</button>
          </div>
        </div>
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm">
          <Badge tone="accent">{view.kind === "index" ? meta.label : view.label}</Badge>
          {view.kind === "strike" && <button onClick={() => setView({ kind: "index" })} className="text-xs text-text-muted hover:text-text">back to index</button>}
        </div>
        <div className="grid grid-cols-2 divide-x divide-border border-b border-border sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-wider text-text-faint">{s.label}</div>
              <div className={`font-mono text-sm font-semibold tabular-nums ${s.cls}`}>{s.value}</div>
            </div>
          ))}
        </div>
        <div className="p-3">
          {err && <div className="mb-3 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{err}</div>}
          {candles ? <PriceChart candles={candles} lines={hsnData ? [...lines, ...hsnData.hlines] : lines} showBubbles={false} showZones={false} markers={chartOverlays.markers} levelLines={chartOverlays.levelLines} boxes={chartOverlays.boxes} /> : <Skeleton className="h-[440px] w-full" />}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-3 py-2.5 text-xs text-text-muted">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-danger" /> call wall</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm bg-success" /> put wall</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm" style={{ background: "#a78bfa" }} /> max pain</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm" style={{ background: "#f59e0b" }} /> call wall forming / <span className="h-2 w-3 rounded-sm" style={{ background: "#84cc16" }} /> put wall forming (↑OI today)</span>
          <span>▲ / ▼ = Range &amp; session break · ✓ OI-confirmed · ✗ OI fade</span>
          <span>dashed = Gann</span>
          <span>BOS / CHoCH + HH/HL/LH/LL = SMC structure</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm" style={{ background: "rgba(242,54,69,0.3)" }} /> premium / <span className="h-2 w-3 rounded-sm" style={{ background: "rgba(8,153,129,0.3)" }} /> discount zone</span>
          <span>dashed = internal structure &amp; EQH/EQL</span>
          <span>strong / weak high-low</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm" style={{ background: "#089981" }} /> trendlines + B breakouts</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm" style={{ background: "#eab308" }} /> opening range · PT1/PT2 target bands · 1/2 = target hit</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-3 rounded-sm" style={{ background: "#049108" }} /> HSN Buy/Sell + trailing stop · <span className="h-2 w-3 rounded-sm" style={{ background: "rgba(242,54,69,0.3)" }} /> supply / <span className="h-2 w-3 rounded-sm" style={{ background: "rgba(8,153,129,0.3)" }} /> demand · OB/OS = RSI reversals</span>
        </div>
      </Card>
      {opt && opt.strikes.length > 0 && (
        <Card className="mt-4 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Open a strike chart</h2>
            <div className="flex rounded-lg border border-border p-0.5">
              {(["CE", "PE"] as const).map((sd) => {
                const on = strikeSide === sd;
                const tone = sd === "CE" ? "text-success" : "text-danger";
                return (
                  <button key={sd} onClick={() => switchSide(sd)} className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${on ? `bg-surface-3 ${tone}` : "text-text-muted hover:text-text"}`}>{sd}</button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {opt.strikes.map((s) => {
              const sym = strikeSide === "CE" ? s.ceSym : s.peSym;
              if (!sym) return null;
              const ltp = strikeSide === "CE" ? s.ceLTP : s.peLTP;
              const active = view.kind === "strike" && view.sym === sym;
              const atm = s.strike === atmStrike;
              return (
                <button key={s.strike} onClick={() => setView({ kind: "strike", sym, label: `${s.strike} ${strikeSide}` })} className={`shrink-0 rounded-md border px-2.5 py-1 text-center font-mono text-xs tabular-nums transition-colors ${active ? "border-accent bg-surface-3 text-text" : atm ? "border-border-strong text-text" : "border-border text-text-muted hover:border-border-strong hover:text-text"}`}>
                  <span className="flex items-center justify-center gap-1">{s.strike}{atm && <span className="rounded-sm border border-accent px-1 text-[9px] text-accent-text">ATM</span>}</span>
                  <span className="block text-[10px] text-text-faint">{ltp ? ltp.toFixed(1) : "—"}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-text-faint">Strike charts plot the option premium over time. Toggle <span className="text-success">CE</span> / <span className="text-danger">PE</span> for calls or puts — the number under each strike is its last premium.</p>
        </Card>
      )}
    </div>
  );
}
