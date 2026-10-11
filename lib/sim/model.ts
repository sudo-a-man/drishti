// Transparent logistic-regression model for the lab. Learns from past bars and
// is scored on bars it never saw. EDUCATIONAL / SIMULATION ONLY: not a signal,
// not advice. More features mostly raise TRAIN accuracy while TEST accuracy
// stays near 50% (overfitting). The historical feed is premium OHLCV only, so
// these features are price-derived; true IV / greeks / OI history aren't in it.
import type { Candle } from "./agent";

export type Model = { w: number[]; mean: number[]; std: number[]; trainAcc: number; testAcc: number; trainEnd: number };

const FEATS = 5; // [return1, return3, return5, range-position(10), volatility(5)]
const WARMUP = 11;
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const safe = (a: number, b: number) => (b ? (a - b) / b : 0);

function featureRow(c: Candle[], i: number): number[] | null {
  if (i < WARMUP) return null;
  let hi = -Infinity, lo = Infinity;
  for (let k = i - 9; k <= i; k++) { hi = Math.max(hi, c[k].high); lo = Math.min(lo, c[k].low); }
  const rangePos = hi > lo ? (c[i].close - lo) / (hi - lo) : 0.5;
  const rets: number[] = [];
  for (let k = i - 4; k <= i; k++) rets.push(safe(c[k].close, c[k - 1].close));
  const m = rets.reduce((a, b) => a + b, 0) / rets.length;
  const vol = Math.sqrt(rets.reduce((a, b) => a + (b - m) ** 2, 0) / rets.length);
  return [safe(c[i].close, c[i - 1].close), safe(c[i].close, c[i - 3].close), safe(c[i].close, c[i - 5].close), rangePos, vol];
}

function predictFromFeat(m: Model, f: number[]): number {
  let z = m.w[FEATS];
  for (let j = 0; j < FEATS; j++) z += m.w[j] * ((f[j] - m.mean[j]) / m.std[j]);
  return sigmoid(z);
}

export function predict(m: Model, c: Candle[], i: number): number {
  const f = featureRow(c, i);
  return f ? predictFromFeat(m, f) : 0.5;
}

// Fit weights on bars [WARMUP, trainEnd); label = next bar up.
function fit(c: Candle[], trainEnd: number): Model | null {
  const X: number[][] = [], y: number[] = [];
  for (let i = WARMUP; i < trainEnd - 1; i++) {
    const f = featureRow(c, i);
    if (f) { X.push(f); y.push(c[i + 1].close > c[i].close ? 1 : 0); }
  }
  if (X.length < 25) return null;
  const mean = Array(FEATS).fill(0), std = Array(FEATS).fill(0);
  for (const row of X) for (let j = 0; j < FEATS; j++) mean[j] += row[j] / X.length;
  for (const row of X) for (let j = 0; j < FEATS; j++) std[j] += (row[j] - mean[j]) ** 2 / X.length;
  for (let j = 0; j < FEATS; j++) std[j] = Math.sqrt(std[j]) || 1;
  const w = Array(FEATS + 1).fill(0);
  for (let it = 0; it < 500; it++) {
    const g = Array(FEATS + 1).fill(0);
    for (let n = 0; n < X.length; n++) {
      let z = w[FEATS];
      for (let j = 0; j < FEATS; j++) z += w[j] * ((X[n][j] - mean[j]) / std[j]);
      const err = sigmoid(z) - y[n];
      for (let j = 0; j < FEATS; j++) g[j] += (err * ((X[n][j] - mean[j]) / std[j])) / X.length;
      g[FEATS] += err / X.length;
    }
    for (let j = 0; j <= FEATS; j++) w[j] -= 0.1 * g[j];
  }
  return { w, mean, std, trainAcc: 0, testAcc: 0, trainEnd };
}

function accuracy(m: Model, c: Candle[], from: number, to: number): number {
  let correct = 0, n = 0;
  for (let i = from; i < to && i < c.length - 1; i++) {
    const f = featureRow(c, i);
    if (!f) continue;
    if ((predictFromFeat(m, f) >= 0.5 ? 1 : 0) === (c[i + 1].close > c[i].close ? 1 : 0)) correct++;
    n++;
  }
  return n ? correct / n : 0;
}

export function train(c: Candle[], trainFrac = 0.6): Model | null {
  const trainEnd = Math.floor(c.length * trainFrac);
  if (trainEnd < WARMUP + 25 || c.length - trainEnd < 10) return null;
  const m = fit(c, trainEnd);
  if (!m) return null;
  m.trainAcc = accuracy(m, c, WARMUP, trainEnd);
  m.testAcc = accuracy(m, c, trainEnd, c.length);
  return m;
}

// Walk-forward: train on an expanding window, score the next unseen chunk, repeat.
// The honest robustness check; it keeps landing near 50%.
export function walkForward(c: Candle[]): number {
  const accs: number[] = [];
  for (const sp of [0.5, 0.6, 0.7, 0.8]) {
    const te = Math.floor(c.length * sp);
    const end = Math.floor(c.length * (sp + 0.1));
    const m = fit(c, te);
    if (m) accs.push(accuracy(m, c, te, end));
  }
  return accs.length ? accs.reduce((a, b) => a + b, 0) / accs.length : 0.5;
}
