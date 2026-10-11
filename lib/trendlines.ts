import type { Candle } from "./sim/agent";

// Trendlines with breakouts, written fresh. Each confirmed swing high seeds a
// line sloping down, each swing low a line sloping up; the per-bar slope comes
// from ATR / stdev / linreg over the lookback. Lines are drawn for every swing
// across the series (the newest extends to the right, dashed), so they stay
// readable on fast and slow timeframes alike. A "B" marks where close breaks
// back through the active line. Generic concept, not a vendor port. Descriptive
// structure, not advice.
export type TrendLine = { color: string; dashed?: boolean; noScale?: boolean; points: { time: number; value: number }[] };
export type TrendMarker = { time: number; text: string; up: boolean; color: string };
export type Trendlines = { lines: TrendLine[]; markers: TrendMarker[] };

const TEAL = "#089981", RED = "#f23645";
export type SlopeMethod = "atr" | "stdev" | "linreg";
type Pivot = { p: number; price: number; slope: number };

const isPH = (c: Candle[], p: number, len: number) => {
  for (let k = p - len; k <= p + len; k++) { if (k < 0 || k >= c.length) continue; if (c[k].high > c[p].high) return false; }
  return true;
};
const isPL = (c: Candle[], p: number, len: number) => {
  for (let k = p - len; k <= p + len; k++) { if (k < 0 || k >= c.length) continue; if (c[k].low < c[p].low) return false; }
  return true;
};

// Per-bar slope magnitude by method, scaled to a per-bar price step.
function slopeSeries(c: Candle[], len: number, mult: number, method: SlopeMethod): number[] {
  const out: number[] = [];
  if (method === "atr") {
    let prev = c[0].high - c[0].low;
    for (let i = 0; i < c.length; i++) {
      const tr = i ? Math.max(c[i].high - c[i].low, Math.abs(c[i].high - c[i - 1].close), Math.abs(c[i].low - c[i - 1].close)) : c[0].high - c[0].low;
      prev = i ? (prev * (len - 1) + tr) / len : tr;
      out.push(prev / len * mult);
    }
  } else if (method === "stdev") {
    for (let i = 0; i < c.length; i++) {
      const s = Math.max(0, i - len + 1); let m = 0, n = 0;
      for (let k = s; k <= i; k++) { m += c[k].close; n++; }
      m /= n; let v = 0;
      for (let k = s; k <= i; k++) v += (c[k].close - m) ** 2;
      out.push(Math.sqrt(v / n) / len * mult);
    }
  } else {
    for (let i = 0; i < c.length; i++) {
      const s = Math.max(0, i - len + 1); let n = 0, sx = 0, sy = 0, sxy = 0, sxx = 0;
      for (let k = s; k <= i; k++) { const y = c[k].close; n++; sx += k; sy += y; sxy += k * y; sxx += k * k; }
      const denom = n * sxx - sx * sx;
      out.push((denom ? Math.abs(n * sxy - sx * sy) / denom : 0) / 2 * mult);
    }
  }
  return out;
}

export function trendlines(c: Candle[], length = 14, mult = 1, method: SlopeMethod = "atr", maxLines = 25): Trendlines {
  const n = c.length;
  const lines: TrendLine[] = [], markers: TrendMarker[] = [];
  if (n < length * 2 + 1) return { lines, markers };
  const slope = slopeSeries(c, length, mult, method);
  const phs: Pivot[] = [], pls: Pivot[] = [];
  let curPh: Pivot | null = null, curPl: Pivot | null = null, upos = 0, dnos = 0;
  for (let i = 0; i < n; i++) {
    const p = i - length;
    const phConf = p >= length && isPH(c, p, length);
    const plConf = p >= length && isPL(c, p, length);
    if (phConf) { curPh = { p, price: c[p].high, slope: slope[i] }; phs.push(curPh); }
    if (plConf) { curPl = { p, price: c[p].low, slope: slope[i] }; pls.push(curPl); }
    const pu = upos, pd = dnos;
    if (phConf) upos = 0;
    else if (curPh && c[i].close > curPh.price - curPh.slope * (i - curPh.p)) upos = 1;
    if (plConf) dnos = 0;
    else if (curPl && c[i].close < curPl.price + curPl.slope * (i - curPl.p)) dnos = 1;
    if (upos > pu) markers.push({ time: c[i].time, text: "B", up: true, color: TEAL });
    if (dnos > pd) markers.push({ time: c[i].time, text: "B", up: false, color: RED });
  }
  const last = n - 1;
  // One ray per swing: from its pivot to the next pivot (solid); the newest runs
  // to the right edge (dashed). noScale keeps a long projection off the candles'
  // price axis so it never squashes the chart on fast timeframes.
  const emit = (arr: Pivot[], up: boolean) => {
    const start = Math.max(0, arr.length - maxLines);
    for (let k = start; k < arr.length; k++) {
      const a = arr[k];
      const endBar = k + 1 < arr.length ? arr[k + 1].p : last;
      const dashed = k === arr.length - 1;
      const endVal = up ? a.price - a.slope * (endBar - a.p) : a.price + a.slope * (endBar - a.p);
      lines.push({ color: up ? TEAL : RED, dashed, noScale: true, points: [{ time: c[a.p].time, value: a.price }, { time: c[endBar].time, value: endVal }] });
    }
  };
  emit(phs, true);
  emit(pls, false);
  return { lines, markers: markers.slice(-80) };
}
