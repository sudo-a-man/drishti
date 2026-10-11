import { initSim, step, equityOf, START_CASH, type Candle, type StepOpts } from "./agent";
import { train, predict } from "./model";
import { computeSignals } from "./indicator";

export type Source = "rule" | "model" | "signal";
export type Result = { final: number; trades: number; wins: number; maxDD: number; profitFactor: number; sharpe: number; testAcc: number | null };
export type RunOpts = { strategy?: "buy" | "sell"; cost?: number; threshold?: number };

// Run the full paper sim on one series to completion and return the outcome
// plus a scorecard (max drawdown, profit factor, per-bar Sharpe). Used by the
// "backtest all strikes" view so you judge the distribution, not one lucky run.
export function runSeries(cs: Candle[], source: Source, opts: RunOpts = {}): Result {
  const m = source === "model" ? train(cs) : null;
  if (source === "model" && !m) return { final: START_CASH, trades: 0, wins: 0, maxDD: 0, profitFactor: 0, sharpe: 0, testAcc: null };
  const sigs = source === "signal" ? computeSignals(cs) : null;
  let state = m ? { ...initSim(), i: m.trainEnd - 1 } : initSim();
  const equity: number[] = [state.cash];
  const pnls: number[] = [];
  while (state.i < cs.length - 1) {
    const next = state.i + 1;
    const stepOpts: StepOpts =
      source === "model" && m ? { signalUp: predict(m, cs, next), threshold: opts.threshold, strategy: opts.strategy, cost: opts.cost }
      : source === "signal" && sigs ? { entry: sigs[next]?.long ? "long" : sigs[next]?.short ? "short" : undefined, cost: opts.cost }
      : { strategy: opts.strategy, cost: opts.cost };
    const { state: ns, log } = step(state, cs, stepOpts);
    if (log?.action === "SELL" && typeof log.pnl === "number") pnls.push(log.pnl);
    state = ns;
    equity.push(equityOf(state, cs[state.i].close));
  }
  const final = equityOf(state, cs[cs.length - 1].close);

  let peak = equity[0], maxDD = 0;
  for (const e of equity) { peak = Math.max(peak, e); if (peak > 0) maxDD = Math.max(maxDD, (peak - e) / peak); }
  const gains = pnls.filter((p) => p > 0).reduce((a, b) => a + b, 0);
  const losses = Math.abs(pnls.filter((p) => p < 0).reduce((a, b) => a + b, 0));
  const profitFactor = losses > 0 ? Math.min(999, gains / losses) : gains > 0 ? 999 : 0;
  const rets: number[] = [];
  for (let k = 1; k < equity.length; k++) if (equity[k - 1] > 0) rets.push((equity[k] - equity[k - 1]) / equity[k - 1]);
  const mr = rets.length ? rets.reduce((a, b) => a + b, 0) / rets.length : 0;
  const sd = Math.sqrt(rets.reduce((a, b) => a + (b - mr) ** 2, 0) / (rets.length || 1)) || 1;
  const sharpe = mr / sd;

  return { final, trades: pnls.length, wins: pnls.filter((p) => p > 0).length, maxDD, profitFactor, sharpe, testAcc: m ? m.testAcc : null };
}
