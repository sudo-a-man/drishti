import type { Candle } from "./sim/agent";

// Smart-Money-Concepts, written fresh. Swing + internal structure (BOS/CHoCH),
// swing points, EQH/EQL, strong/weak highs & lows, premium/discount zones, plus
// previous day/week/month levels. Descriptive structure, not advice.
export type SmcLine = { from: number; to: number; price: number; color: string; dashed?: boolean };
export type SmcMarker = { time: number; text: string; up: boolean; color: string };
export type SmcBox = { time: number; top: number; bottom: number; rgb: string };
export type SmcHLine = { price: number; color: string; title: string; dashed?: boolean };
export type Smc = { lines: SmcLine[]; markers: SmcMarker[]; boxes: SmcBox[]; hlines: SmcHLine[] };

const GREEN = "#089981", RED = "#f23645", BLUE = "#2157f3";
const IST = 19800;

const isPivot = (c: Candle[], p: number, len: number, high: boolean) => {
  for (let k = p - len; k <= p + len; k++) {
    if (k < 0 || k >= c.length) continue;
    if (high ? c[k].high > c[p].high : c[k].low < c[p].low) return false;
  }
  return true;
};

type Piv = { time: number; price: number };

function structure(c: Candle[], len: number, dashed: boolean, labelSwings: boolean) {
  const lines: SmcLine[] = [], markers: SmcMarker[] = [], pivHighs: Piv[] = [], pivLows: Piv[] = [];
  let hP: number | null = null, hT = 0, hC = false, prevH: number | null = null;
  let lP: number | null = null, lT = 0, lC = false, prevL: number | null = null;
  let trend = 0;
  for (let i = 0; i < c.length; i++) {
    const p = i - len;
    if (p >= len) {
      if (isPivot(c, p, len, true)) {
        if (labelSwings) markers.push({ time: c[p].time, text: prevH !== null && c[p].high <= prevH ? "LH" : "HH", up: false, color: RED });
        pivHighs.push({ time: c[p].time, price: c[p].high }); prevH = c[p].high; hP = c[p].high; hT = c[p].time; hC = false;
      }
      if (isPivot(c, p, len, false)) {
        if (labelSwings) markers.push({ time: c[p].time, text: prevL !== null && c[p].low >= prevL ? "HL" : "LL", up: true, color: GREEN });
        pivLows.push({ time: c[p].time, price: c[p].low }); prevL = c[p].low; lP = c[p].low; lT = c[p].time; lC = false;
      }
    }
    if (hP !== null && !hC && c[i].close > hP) { markers.push({ time: c[i].time, text: trend === -1 ? "CHoCH" : "BOS", up: true, color: GREEN }); lines.push({ from: hT, to: c[i].time, price: hP, color: GREEN, dashed }); trend = 1; hC = true; }
    if (lP !== null && !lC && c[i].close < lP) { markers.push({ time: c[i].time, text: trend === 1 ? "CHoCH" : "BOS", up: false, color: RED }); lines.push({ from: lT, to: c[i].time, price: lP, color: RED, dashed }); trend = -1; lC = true; }
  }
  return { lines, markers, pivHighs, pivLows, lastH: hP, lastHt: hT, lastL: lP, lastLt: lT, trend };
}

export function smc(c: Candle[], swingLen = 10, internalLen = 5): Smc {
  const lines: SmcLine[] = [], markers: SmcMarker[] = [], boxes: SmcBox[] = [], hlines: SmcHLine[] = [];
  const sw = structure(c, swingLen, false, true);
  const inr = structure(c, internalLen, true, false);
  lines.push(...sw.lines, ...inr.lines);
  markers.push(...sw.markers, ...inr.markers);
  const m = Math.min(c.length, 50);
  let rng = 0;
  for (let i = Math.max(0, c.length - m); i < c.length; i++) rng += (c[i].high - c[i].low) / m;
  const thr = rng * 0.1;
  for (let i = 1; i < sw.pivHighs.length; i++) { const a = sw.pivHighs[i - 1], b = sw.pivHighs[i]; if (Math.abs(a.price - b.price) < thr) { lines.push({ from: a.time, to: b.time, price: (a.price + b.price) / 2, color: RED, dashed: true }); markers.push({ time: b.time, text: "EQH", up: false, color: RED }); } }
  for (let i = 1; i < sw.pivLows.length; i++) { const a = sw.pivLows[i - 1], b = sw.pivLows[i]; if (Math.abs(a.price - b.price) < thr) { lines.push({ from: a.time, to: b.time, price: (a.price + b.price) / 2, color: GREEN, dashed: true }); markers.push({ time: b.time, text: "EQL", up: true, color: GREEN }); } }
  if (sw.lastH !== null) hlines.push({ price: sw.lastH, color: RED, title: sw.trend === -1 ? "Strong High" : "Weak High" });
  if (sw.lastL !== null) hlines.push({ price: sw.lastL, color: GREEN, title: sw.trend === 1 ? "Strong Low" : "Weak Low" });
  if (sw.lastH !== null && sw.lastL !== null) {
    const top = Math.max(sw.lastH, sw.lastL), bot = Math.min(sw.lastH, sw.lastL), t = Math.min(sw.lastHt, sw.lastLt);
    boxes.push({ time: t, top, bottom: 0.95 * top + 0.05 * bot, rgb: "242,54,69" });
    boxes.push({ time: t, top: 0.525 * top + 0.475 * bot, bottom: 0.525 * bot + 0.475 * top, rgb: "135,139,148" });
    boxes.push({ time: t, top: 0.95 * bot + 0.05 * top, bottom: bot, rgb: "8,153,129" });
  }
  return { lines: lines.slice(-60), markers: markers.slice(-110), boxes, hlines };
}

// Previous day / week / month high and low, from a daily candle series.
export function mtfLevels(daily: Candle[]): SmcHLine[] {
  const out: SmcHLine[] = [];
  const n = daily.length;
  if (n < 2) return out;
  const pd = daily[n - 2];
  out.push({ price: pd.high, color: BLUE, title: "PDH" }, { price: pd.low, color: BLUE, title: "PDL" });
  const groupPrev = (keyFn: (t: number) => number): [number, number] | null => {
    const g: { k: number; hi: number; lo: number }[] = [];
    for (const b of daily) { const k = keyFn(b.time); const last = g[g.length - 1]; if (last && last.k === k) { last.hi = Math.max(last.hi, b.high); last.lo = Math.min(last.lo, b.low); } else g.push({ k, hi: b.high, lo: b.low }); }
    return g.length >= 2 ? [g[g.length - 2].hi, g[g.length - 2].lo] : null;
  };
  const w = groupPrev((t) => Math.floor((t + IST) / 604800));
  if (w) out.push({ price: w[0], color: BLUE, title: "PWH", dashed: true }, { price: w[1], color: BLUE, title: "PWL", dashed: true });
  const mo = groupPrev((t) => { const d = new Date((t + IST) * 1000); return d.getUTCFullYear() * 12 + d.getUTCMonth(); });
  if (mo) out.push({ price: mo[0], color: BLUE, title: "PMH", dashed: true }, { price: mo[1], color: BLUE, title: "PML", dashed: true });
  return out;
}
