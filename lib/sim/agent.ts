// Paper-trading agent for the Lumetra lab. SIMULATION ONLY, no real orders.
// Replays a historical premium series one candle at a time and trades a
// simulated balance with transparent, fixed rules. It does NOT predict.
// Sizing is notional (the whole balance rides one option's % move). It can go
// long (buy premium, hurt by decay) or short (sell premium, helped by decay but
// with large tail risk). Every round trip pays a cost so results stay honest.

export type Candle = { time: number; open: number; high: number; low: number; close: number; volume?: number };
export type Position = { entry: number; invested: number; bars: number; dir: 1 | -1 } | null;
export type SimState = { cash: number; startCash: number; position: Position; i: number };
export type LogEntry = { i: number; time: number; action: "BUY" | "SELL" | "HOLD"; price: number; reason: string; pnl?: number };
export type StepOpts = { signalUp?: number; threshold?: number; strategy?: "buy" | "sell"; cost?: number; entry?: "long" | "short" };

export const RULES = { takeProfit: 0.15, stopLoss: 0.1, maxBars: 8 };
export const ROUND_TRIP_COST = 0.015; // ~bid/ask spread + brokerage, as a fraction of the trade
export const START_CASH = 50000; // simulated starting balance (rupees)

export function initSim(startCash = START_CASH): SimState {
  return { cash: startCash, startCash, position: null, i: -1 };
}

export function equityOf(s: SimState, price: number): number {
  if (!s.position) return s.cash;
  const ret = (s.position.dir * (price - s.position.entry)) / s.position.entry;
  return s.cash + s.position.invested * (1 + ret);
}

export function step(s: SimState, candles: Candle[], opts?: StepOpts): { state: SimState; log: LogEntry | null } {
  const i = s.i + 1;
  if (i >= candles.length) return { state: s, log: null };
  const c = candles[i];
  const prev = candles[i - 1];
  const strategy = opts?.strategy ?? "buy";
  const cost = opts?.cost ?? ROUND_TRIP_COST;
  const dir = (strategy === "sell" ? -1 : 1) as 1 | -1;
  let cash = s.cash;
  let position = s.position;
  let log: LogEntry | null = null;

  if (position) {
    const ret = (position.dir * (c.close - position.entry)) / position.entry;
    const bars = position.bars + 1;
    const exit = ret >= RULES.takeProfit || ret <= -RULES.stopLoss || bars >= RULES.maxBars;
    if (exit) {
      const value = position.invested * (1 + ret) * (1 - cost);
      const pnl = value - position.invested;
      cash = cash + value;
      const why = ret >= RULES.takeProfit ? "take-profit" : ret <= -RULES.stopLoss ? "stop-loss" : "time / decay exit";
      log = { i, time: c.time, action: "SELL", price: c.close, reason: `${why} (after costs)`, pnl };
      position = null;
    } else {
      position = { entry: position.entry, invested: position.invested, bars, dir: position.dir };
      log = { i, time: c.time, action: "HOLD", price: c.close, reason: `holding ${(ret * 100).toFixed(1)}%` };
    }
  } else {
    const sig = opts?.signalUp;
    const thr = opts?.threshold ?? 0.5;
    let enterDir: 1 | -1 | 0 = 0;
    if (opts?.entry) {
      enterDir = opts.entry === "short" ? -1 : 1;
    } else {
      const want = sig !== undefined ? (strategy === "sell" ? sig <= 1 - thr : sig >= thr) : prev ? (strategy === "sell" ? c.close < prev.close : c.close > prev.close) : false;
      enterDir = want ? dir : 0;
    }
    if (enterDir !== 0 && cash > 0 && c.close > 0) {
      position = { entry: c.close, invested: cash, bars: 0, dir: enterDir };
      const base = sig !== undefined ? `model P(up) ${(sig * 100).toFixed(0)}%, ` : opts?.entry ? "indicator, " : "";
      log = { i, time: c.time, action: "BUY", price: c.close, reason: `${base}${enterDir === -1 ? "short premium" : "long / all-in"}` };
      cash = 0;
    } else {
      log = { i, time: c.time, action: "HOLD", price: c.close, reason: "no entry signal" };
    }
  }

  return { state: { cash, startCash: s.startCash, position, i }, log };
}
