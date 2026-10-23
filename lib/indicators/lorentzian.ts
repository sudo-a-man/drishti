// Faithful TypeScript core of jdehorty's "Lorentzian Classification": an
// Approximate-Nearest-Neighbours classifier over normalized oscillator features
// (RSI / WaveTrend / CCI / ADX) using Lorentzian distance, gated by a
// Rational-Quadratic Nadaraya-Watson kernel trend filter. Reimplementation of the
// TradingView original (external MLExtensions/KernelFunctions libs reconstructed),
// so not bit-identical. Experimental study — not advice.
import type { Candle } from "@/components/PriceChart";

type MK = { time: number; text: string; up: boolean; color: string };
type LL = { color: string; dashed: boolean | undefined; points: { time: number; value: number }[] };

const emaS = (src: number[], n: number): number[] => {
  const out = new Array(src.length).fill(NaN); const k = 2 / (n + 1); let p = NaN;
  for (let i = 0; i < src.length; i++) {
    if (Number.isNaN(p)) { if (i >= n - 1) { let s = 0; for (let j = i - n + 1; j <= i; j++) s += src[j]; p = s / n; out[i] = p; } }
    else { p = src[i] * k + p * (1 - k); out[i] = p; }
  }
  return out;
};

function rsiS(src: number[], n: number): number[] {
  const out = new Array(src.length).fill(NaN); let ag = 0, al = 0;
  for (let i = 1; i < src.length; i++) {
    const ch = src[i] - src[i - 1], g = Math.max(ch, 0), l = Math.max(-ch, 0);
    if (i <= n) { ag += g / n; al += l / n; if (i === n) out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al); }
    else { ag = (ag * (n - 1) + g) / n; al = (al * (n - 1) + l) / n; out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al); }
  }
  return out;
}

function cciS(src: number[], n: number): number[] {
  const out = new Array(src.length).fill(NaN);
  for (let i = n - 1; i < src.length; i++) {
    let m = 0; for (let j = i - n + 1; j <= i; j++) m += src[j]; m /= n;
    let md = 0; for (let j = i - n + 1; j <= i; j++) md += Math.abs(src[j] - m); md /= n;
    out[i] = md === 0 ? 0 : (src[i] - m) / (0.015 * md);
  }
  return out;
}

function adxS(h: number[], l: number[], c: number[], n: number): number[] {
  const len = h.length, out = new Array(len).fill(NaN);
  const tr = new Array(len).fill(0), pdm = new Array(len).fill(0), ndm = new Array(len).fill(0);
  for (let i = 1; i < len; i++) {
    const up = h[i] - h[i - 1], dn = l[i - 1] - l[i];
    pdm[i] = up > dn && up > 0 ? up : 0; ndm[i] = dn > up && dn > 0 ? dn : 0;
    tr[i] = Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1]));
  }
  const rma = (s: number[]): number[] => { const o = new Array(len).fill(NaN); let p = NaN; for (let i = 1; i < len; i++) { if (Number.isNaN(p)) { if (i >= n) { let a = 0; for (let j = i - n + 1; j <= i; j++) a += s[j]; p = a / n; o[i] = p; } } else { p = (p * (n - 1) + s[i]) / n; o[i] = p; } } return o; };
  const atr = rma(tr), sp = rma(pdm), sm = rma(ndm);
  const dx = new Array(len).fill(NaN);
  for (let i = 0; i < len; i++) { if (!Number.isNaN(atr[i]) && atr[i]) { const pDI = 100 * sp[i] / atr[i], nDI = 100 * sm[i] / atr[i]; dx[i] = pDI + nDI === 0 ? 0 : 100 * Math.abs(pDI - nDI) / (pDI + nDI); } }
  let p = NaN, seen = 0, acc = 0;
  for (let i = 0; i < len; i++) {
    if (Number.isNaN(dx[i])) continue;
    if (Number.isNaN(p)) { acc += dx[i]; seen++; if (seen === n) { p = acc / n; out[i] = p; } }
    else { p = (p * (n - 1) + dx[i]) / n; out[i] = p; }
  }
  return out;
}

function wtS(hlc3: number[], n1: number, n2: number): number[] {
  const esa = emaS(hlc3, n1);
  const dAbs = hlc3.map((v, i) => Math.abs(v - (esa[i] ?? v)));
  const d = emaS(dAbs, n1);
  const ci = hlc3.map((v, i) => (d[i] ? (v - esa[i]) / (0.015 * d[i]) : 0));
  return emaS(ci, n2);
}

const rescale01 = (s: number[], lo = 0, hi = 100): number[] => s.map((v) => (Number.isNaN(v) ? NaN : Math.max(0, Math.min(1, (v - lo) / (hi - lo)))));

function runNorm(s: number[]): number[] {
  let mn = Infinity, mx = -Infinity;
  return s.map((v) => { if (Number.isNaN(v)) return NaN; mn = Math.min(mn, v); mx = Math.max(mx, v); return mx > mn ? (v - mn) / (mx - mn) : 0.5; });
}

function rationalQuadratic(src: number[], h: number, r: number, startAtBar: number): number[] {
  const out = new Array(src.length).fill(NaN);
  for (let t = 0; t < src.length; t++) {
    let cw = 0, sw = 0; const lim = Math.min(t, startAtBar + 100);
    for (let i = 0; i <= lim; i++) { const w = Math.pow(1 + (i * i) / (h * h * 2 * r), -r); cw += src[t - i] * w; sw += w; }
    out[t] = sw ? cw / sw : src[t];
  }
  return out;
}

export function lorentzian(c: Candle[], neighbors = 8, featureCount = 5): { markers: MK[]; levelLines: LL[] } {
  const n = c.length;
  if (n < 60) return { markers: [], levelLines: [] };
  const close = c.map((x) => x.close), high = c.map((x) => x.high), low = c.map((x) => x.low);
  const hlc3 = c.map((x) => (x.high + x.low + x.close) / 3);
  // Normalized feature series (defaults from the original script)
  const F = [
    rescale01(emaS(rsiS(close, 14), 1)),
    runNorm(wtS(hlc3, 10, 11)),
    runNorm(emaS(cciS(close, 20), 1)),
    rescale01(adxS(high, low, close, 20)),
    rescale01(emaS(rsiS(close, 9), 1)),
  ].slice(0, featureCount);
  const dist = (a: number, b: number): number => {
    let d = 0;
    for (let k = 0; k < F.length; k++) { const cur = F[k][a], hist = F[k][b]; if (Number.isNaN(cur) || Number.isNaN(hist)) return Infinity; d += Math.log(1 + Math.abs(cur - hist)); }
    return d;
  };
  // Training labels: realized direction over a 4-bar window (per the original)
  const y = new Array(n).fill(0);
  for (let i = 4; i < n; i++) y[i] = close[i - 4] < close[i] ? -1 : close[i - 4] > close[i] ? 1 : 0;
  // Rational-Quadratic Nadaraya-Watson kernel trend estimate
  const yhat = rationalQuadratic(close, 8, 8, 25);

  // Approximate-Nearest-Neighbours loop (persistent neighbor set, ~every 4 bars, keep k)
  const predictions: number[] = [], distances: number[] = [];
  const predByBar = new Array(n).fill(0);
  const warm = 40;
  for (let t = warm; t < n; t++) {
    let lastDist = -1;
    for (let i = 0; i <= t - 1; i++) {
      if (i % 4 === 0) continue;
      const d = dist(t, i);
      if (d !== Infinity && d >= lastDist) {
        lastDist = d; distances.push(d); predictions.push(y[i]);
        if (predictions.length > neighbors) { lastDist = distances[Math.round((neighbors * 3) / 4)]; distances.shift(); predictions.shift(); }
      }
    }
    predByBar[t] = predictions.reduce((a, b) => a + b, 0);
  }

  // Signal state machine gated by the kernel trend → entry markers
  const markers: MK[] = [];
  let signal = 0, prevSignal = 0;
  for (let t = warm; t < n; t++) {
    const pred = predByBar[t];
    const isBull = yhat[t] > yhat[t - 1], isBear = yhat[t] < yhat[t - 1];
    signal = pred > 0 ? 1 : pred < 0 ? -1 : signal;
    const changed = signal !== prevSignal;
    if (changed && signal === 1 && isBull) markers.push({ time: c[t].time, text: `BUY ${pred}`, up: true, color: "#009988" });
    if (changed && signal === -1 && isBear) markers.push({ time: c[t].time, text: `SELL ${pred}`, up: false, color: "#CC3311" });
    prevSignal = signal;
  }
  const kline: LL = { color: "#787b86", dashed: false, points: c.map((x, i) => ({ time: x.time, value: yhat[i] })).filter((p) => !Number.isNaN(p.value)) };
  return { markers: markers.slice(-24), levelLines: [kline] };
}
