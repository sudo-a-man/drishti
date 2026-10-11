"use client";
import { useEffect, useState } from "react";
import { Card, Button, Badge, Skeleton } from "@/components/ui";
import PriceChart from "@/components/PriceChart";
import { initSim, step, RULES, ROUND_TRIP_COST, START_CASH, equityOf, type SimState, type LogEntry, type Candle } from "@/lib/sim/agent";
import { train, predict, walkForward, type Model } from "@/lib/sim/model";
import { runSeries, type Result } from "@/lib/sim/backtest";
import { computeSignals, type Sig } from "@/lib/sim/indicator";

const INDEXES = [
  { id: "nifty", label: "Nifty 50" },
  { id: "banknifty", label: "Bank Nifty" },
  { id: "sensex", label: "Sensex" },
];
type OptStrike = { strike: number; ceSym: string; peSym: string };
const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function LabPage() {
  const [index, setIndex] = useState("sensex");
  const [side, setSide] = useState<"CE" | "PE">("CE");
  const [mode, setMode] = useState<"rule" | "model" | "signal">("rule");
  const [strategy, setStrategy] = useState<"buy" | "sell">("buy");
  const [wf, setWf] = useState<number | null>(null);
  const [signals, setSignals] = useState<Sig[] | null>(null);
  const [model, setModel] = useState<Model | null>(null);
  const threshold = 0.55;
  const [strikes, setStrikes] = useState<OptStrike[]>([]);
  const [label, setLabel] = useState("");
  const [candles, setCandles] = useState<Candle[] | null>(null);
  const [sim, setSim] = useState<SimState>(() => initSim());
  const [log, setLog] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<(Result & { strike: number })[] | null>(null);

  useEffect(() => {
    fetch(`/api/options?u=${index}`, { cache: "no-store" })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => { if (ok) setStrikes(j.strikes || []); });
  }, [index]);

  const price = candles && sim.i >= 0 ? candles[sim.i]?.close ?? 0 : 0;
  const equityNow = equityOf(sim, price);
  const pnl = equityNow - sim.startCash;
  const atEnd = !!candles && sim.i >= candles.length - 1;
  const sells = log.filter((e) => e.action === "SELL");
  const trades = sells.length;
  const winRate = trades ? Math.round((sells.filter((e) => (e.pnl ?? 0) > 0).length / trades) * 100) : 0;

  async function load(symbol: string, lbl: string) {
    setLoading(true); setErr(null); setRunning(false);
    try {
      const r = await fetch(`/api/history?symbol=${encodeURIComponent(symbol)}&res=15&days=10`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not load history");
      const cs = (j.candles ?? []) as Candle[];
      if (!cs.length) throw new Error("No candles for this strike yet (illiquid or too new).");
      let m: Model | null = null;
      let startI = -1;
      if (mode === "model") {
        m = train(cs);
        if (!m) throw new Error("Not enough candles to train the model here. Try another strike or a longer range.");
        startI = m.trainEnd - 1; // replay only the out-of-sample bars the model never saw
        setWf(walkForward(cs));
        setSignals(null);
      } else if (mode === "signal") {
        setSignals(computeSignals(cs));
        setWf(null);
      } else {
        setSignals(null);
        setWf(null);
      }
      setCandles(cs); setLabel(lbl); setModel(m); setLog([]);
      setSim({ ...initSim(), i: startI });
    } catch (e) { setErr((e as Error).message); setCandles(null); }
    finally { setLoading(false); }
  }

  function doStep() {
    if (!candles) return;
    const next = sim.i + 1;
    const opts = mode === "signal" && signals
      ? { entry: signals[next]?.long ? ("long" as const) : signals[next]?.short ? ("short" as const) : undefined }
      : { signalUp: mode === "model" && model ? predict(model, candles, next) : undefined, threshold, strategy };
    const { state, log: entry } = step(sim, candles, opts);
    setSim(state);
    if (entry) setLog((L) => [entry, ...L].slice(0, 120));
  }

  useEffect(() => {
    if (!running || !candles) return;
    if (sim.i >= candles.length - 1) { setRunning(false); return; }
    const t = setTimeout(doStep, 650);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, sim.i, candles]);

  function reset() { setRunning(false); setSim(initSim()); setLog([]); }

  async function runAll() {
    if (!strikes.length) return;
    setBusy(true); setResults(null); setRunning(false); setErr(null); setProgress(0);
    const picks = strikes.map((s) => ({ strike: s.strike, sym: side === "CE" ? s.ceSym : s.peSym })).filter((p) => p.sym).slice(0, 24);
    const out: (Result & { strike: number })[] = [];
    for (const p of picks) {
      try {
        const r = await fetch(`/api/history?symbol=${encodeURIComponent(p.sym)}&res=15&days=10`, { cache: "no-store" });
        const j = await r.json();
        const cs = (j.candles ?? []) as Candle[];
        if (cs.length > 35) out.push({ strike: p.strike, ...runSeries(cs, mode, { strategy }) });
      } catch { /* skip strikes that fail to load */ }
      setProgress(out.length);
    }
    setResults(out); setBusy(false);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        <span className="text-xs font-semibold uppercase tracking-wider text-accent-text">Lab · experimental</span>
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Paper agent</h1>
      <p className="mb-5 mt-1.5 max-w-2xl text-text-muted">
        A simulated ₹50,000 agent that replays historical option premiums and trades them on a fixed rule, with realistic costs. Buy premium or sell it, run the rule or the model, then backtest the whole chain. Simulated money, no real orders. It does not predict, and the honest result is usually a loss. That is the point.
      </p>

      <Card className="mb-4 flex flex-wrap items-end gap-3 p-4">
        <div className="flex gap-1">
          {INDEXES.map((i) => (
            <button key={i.id} onClick={() => setIndex(i.id)} className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${index === i.id ? "bg-surface-3 text-text" : "text-text-muted hover:text-text"}`}>{i.label}</button>
          ))}
        </div>
        <div className="flex rounded-lg border border-border p-0.5">
          {(["CE", "PE"] as const).map((sd) => (
            <button key={sd} onClick={() => setSide(sd)} className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${side === sd ? "bg-surface-3 text-text" : "text-text-muted hover:text-text"}`}>{sd}</button>
          ))}
        </div>
        <div className="flex rounded-lg border border-border p-0.5">
          {(["rule", "model", "signal"] as const).map((md) => (
            <button key={md} onClick={() => { setMode(md); setCandles(null); setModel(null); setSignals(null); }} className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${mode === md ? "bg-surface-3 text-text" : "text-text-muted hover:text-text"}`}>{md === "rule" ? "Rule" : md === "model" ? "Model" : "Range"}</button>
          ))}
        </div>
        <div className="flex rounded-lg border border-border p-0.5">
          {(["buy", "sell"] as const).map((st) => (
            <button key={st} onClick={() => { setStrategy(st); setCandles(null); }} className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${strategy === st ? "bg-surface-3 text-text" : "text-text-muted hover:text-text"}`}>{st === "buy" ? "Buy" : "Sell"}</button>
          ))}
        </div>
        <select
          onChange={(e) => { const s = strikes.find((x) => (side === "CE" ? x.ceSym : x.peSym) === e.target.value); if (s) load(e.target.value, `${s.strike} ${side}`); }}
          className="h-9 rounded-md border border-border-input bg-surface px-3 text-sm text-text"
          defaultValue=""
        >
          <option value="" disabled>Pick a strike…</option>
          {strikes.map((s) => { const sym = side === "CE" ? s.ceSym : s.peSym; return sym ? <option key={s.strike} value={sym}>{s.strike} {side}</option> : null; })}
        </select>
        {label && <Button variant="ghost" size="sm" onClick={reset}>Reset</Button>}
        <Button variant="secondary" size="sm" onClick={runAll} loading={busy} disabled={busy || !strikes.length}>Backtest all {side}</Button>
      </Card>
      {err && <Card className="mb-4 p-3 text-sm text-danger">{err}</Card>}
      {busy && <Card className="mb-4 p-4 text-sm text-text-muted">Backtesting {side} strikes… {progress} done</Card>}
      {results && results.length > 0 && (() => {
        const finals = results.map((r) => r.final);
        const sorted = [...finals].sort((a, b) => a - b);
        const n = sorted.length;
        const median = sorted[Math.floor(n / 2)];
        const avg = finals.reduce((a, b) => a + b, 0) / n;
        const up = finals.filter((f) => f > START_CASH).length;
        const best = sorted[n - 1], worst = sorted[0];
        const avgPF = results.reduce((a, r) => a + Math.min(r.profitFactor, 5), 0) / n;
        const avgSharpe = results.reduce((a, r) => a + r.sharpe, 0) / n;
        const avgDD = results.reduce((a, r) => a + r.maxDD, 0) / n;
        return (
          <Card className="mb-4 p-4">
            <h2 className="mb-2 font-display text-lg font-semibold">₹50,000 across {n} {side} strikes · {mode} · {strategy}</h2>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="text-text-muted">Ended up: <b className={up > n / 2 ? "text-success" : "text-danger"}>{up}/{n}</b></span>
              <span className="text-text-muted">Median: <b className="font-mono text-text">{inr(median)}</b></span>
              <span className="text-text-muted">Average: <b className="font-mono text-text">{inr(avg)}</b></span>
              <span className="text-text-muted">Best: <b className="font-mono text-success">{inr(best)}</b></span>
              <span className="text-text-muted">Worst: <b className="font-mono text-danger">{inr(worst)}</b></span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span className="text-text-muted">Avg profit factor <b className="font-mono text-text">{avgPF.toFixed(2)}</b></span>
              <span className="text-text-muted">Avg Sharpe/bar <b className="font-mono text-text">{avgSharpe.toFixed(3)}</b></span>
              <span className="text-text-muted">Avg max drawdown <b className="font-mono text-text">{(avgDD * 100).toFixed(0)}%</b></span>
            </div>
            <div className="mt-3 flex h-24 items-end gap-1">
              {results.map((r, i) => (
                <div key={i} title={`${r.strike}: ${inr(r.final)}`} className={`flex-1 rounded-t ${r.final >= START_CASH ? "bg-success" : "bg-danger"}`} style={{ height: `${Math.max(3, Math.min(100, (r.final / (best || 1)) * 100))}%` }} />
              ))}
            </div>
            <p className="mt-2 text-xs text-text-faint">Each bar is one strike&apos;s final balance starting from ₹50,000 (green above, red below), {mode === "model" ? "model on out-of-sample bars" : "momentum rule"}. A wide spread with many red bars is variance, not an edge. Simulation only, not advice.</p>
          </Card>
        );
      })()}
      {loading && <Skeleton className="h-[460px] w-full" />}
      {candles && !loading && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
            <div className="bg-surface px-4 py-3"><div className="text-[10px] uppercase tracking-wider text-text-faint">Balance</div><div className="font-mono text-lg font-semibold tabular-nums">{inr(equityNow)}</div></div>
            <div className="bg-surface px-4 py-3"><div className="text-[10px] uppercase tracking-wider text-text-faint">P&amp;L</div><div className={`font-mono text-lg font-semibold tabular-nums ${pnl >= 0 ? "text-success" : "text-danger"}`}>{pnl >= 0 ? "+" : ""}{inr(pnl)}</div></div>
            <div className="bg-surface px-4 py-3"><div className="text-[10px] uppercase tracking-wider text-text-faint">Position</div><div className="font-mono text-sm font-semibold">{sim.position ? `${label} @ ${sim.position.entry.toFixed(1)}` : "Flat"}</div></div>
            <div className="bg-surface px-4 py-3"><div className="text-[10px] uppercase tracking-wider text-text-faint">Step</div><div className="font-mono text-sm font-semibold tabular-nums">{sim.i + 1} / {candles.length}</div></div>
          </div>

          {model && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span className="text-text-muted">Train accuracy <b className="font-mono text-text">{(model.trainAcc * 100).toFixed(0)}%</b></span>
                <span className="text-text-muted">Out-of-sample test <b className="font-mono text-text">{(model.testAcc * 100).toFixed(0)}%</b></span>
                {wf !== null && <span className="text-text-muted">Walk-forward <b className="font-mono text-text">{(wf * 100).toFixed(0)}%</b></span>}
                <span className="text-text-muted">Trades <b className="font-mono text-text">{trades}</b></span>
                <span className="text-text-muted">Win rate <b className="font-mono text-text">{winRate}%</b></span>
              </div>
              <p className="mt-2 text-xs text-text-faint">Replaying only the out-of-sample bars the model never trained on. A test accuracy near 50% means no real edge, and backtest results don&apos;t carry to the future. Simulation only, not advice.</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={doStep} disabled={atEnd || running}>Step</Button>
            <Button size="sm" variant={running ? "danger" : "secondary"} onClick={() => setRunning((r) => !r)} disabled={atEnd}>{running ? "Pause" : "Run"}</Button>
            <span className="text-xs text-text-faint">{mode === "signal" ? "opening-range breakout" : strategy === "sell" ? "selling premium" : "buying premium"} · +{Math.round(RULES.takeProfit * 100)}% target · -{Math.round(RULES.stopLoss * 100)}% stop · {RULES.maxBars}-bar exit · {Math.round(ROUND_TRIP_COST * 1000) / 10}% round-trip cost</span>
          </div>

          <Card className="p-3">
            <PriceChart candles={candles} showBubbles={false} showZones={false} lines={sim.position ? [{ price: sim.position.entry, color: "#a78bfa", title: "entry", dashed: true }] : []} height={320} />
          </Card>

          <Card className="p-0">
            <div className="border-b border-border px-4 py-2 text-sm font-semibold">Decision log</div>
            <ul className="max-h-72 divide-y divide-border overflow-y-auto text-sm">
              {log.length === 0 && <li className="px-4 py-3 text-text-muted">Press Step or Run to start the agent.</li>}
              {log.map((e, k) => (
                <li key={k} className="flex items-center justify-between gap-3 px-4 py-2">
                  <span className="flex items-center gap-2">
                    <Badge tone={e.action === "BUY" ? "accent" : e.action === "SELL" ? (e.pnl && e.pnl >= 0 ? "buy" : "sell") : "muted"}>{e.action}</Badge>
                    <span className="text-text-muted">{e.reason}</span>
                  </span>
                  <span className="font-mono text-xs tabular-nums text-text-muted">{e.price.toFixed(1)}{typeof e.pnl === "number" ? <span className={e.pnl >= 0 ? "text-success" : "text-danger"}> ({e.pnl >= 0 ? "+" : ""}{e.pnl.toFixed(1)})</span> : null}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
