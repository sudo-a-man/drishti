// Port of the "HSN Algo [V9.5]" feature set, reduced to the primitives this chart
// supports. The script's headline is a SuperTrend-style buy/sell signal; alongside
// it we draw its supply & demand zones, nearest support/resistance, and RSI
// reversal markers. The script's own market-structure, order-block and trendline
// layers are left to the existing SMC and Trend overlays, and its ribbon / HTF
// candles / promo table are dropped (no equivalent primitive). Mechanical study,
// not advice.
import type { Candle } from "@/components/PriceChart";

type MK = { time: number; text: string; up: boolean; color: string };
type LL = { color: string; dashed: boolean | undefined; points: { time: number; value: number }[] };
type BX = { time: number; top: number; bottom: number; rgb: string };
type HL = { price: number; color: string; title: string; dashed?: boolean };

// Wilder's ATR (RMA of true range).
function atr(c: Candle[], n: number): number[] {
  const len = c.length, out = new Array(len).fill(NaN), tr = new Array(len).fill(0);
  for (let i = 0; i < len; i++) tr[i] = i === 0 ? c[i].high - c[i].low : Math.max(c[i].high - c[i].low, Math.abs(c[i].high - c[i - 1].close), Math.abs(c[i].low - c[i - 1].close));
  let p = NaN;
  for (let i = 0; i < len; i++) {
    if (Number.isNaN(p)) { if (i >= n - 1) { let s = 0; for (let j = i - n + 1; j <= i; j++) s += tr[j]; p = s / n; out[i] = p; } }
    else { p = (p * (n - 1) + tr[i]) / n; out[i] = p; }
  }
  return out;
}

function rsi(src: number[], n: number): number[] {
  const out = new Array(src.length).fill(NaN); let ag = 0, al = 0;
  for (let i = 1; i < src.length; i++) {
    const ch = src[i] - src[i - 1], g = Math.max(ch, 0), l = Math.max(-ch, 0);
    if (i <= n) { ag += g / n; al += l / n; if (i === n) out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al); }
    else { ag = (ag * (n - 1) + g) / n; al = (al * (n - 1) + l) / n; out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al); }
  }
  return out;
}

// ta.pivothigh / ta.pivotlow: value is returned at the confirmation bar (right bars later).
function pivHigh(c: Candle[], left: number, right: number): number[] {
  const n = c.length, out = new Array(n).fill(NaN);
  for (let i = left + right; i < n; i++) {
    const m = i - right, v = c[m].high; let ok = true;
    for (let j = m - left; j < m; j++) if (c[j].high >= v) { ok = false; break; }
    if (ok) for (let j = m + 1; j <= m + right; j++) if (c[j].high >= v) { ok = false; break; }
    if (ok) out[i] = v;
  }
  return out;
}
function pivLow(c: Candle[], left: number, right: number): number[] {
  const n = c.length, out = new Array(n).fill(NaN);
  for (let i = left + right; i < n; i++) {
    const m = i - right, v = c[m].low; let ok = true;
    for (let j = m - left; j < m; j++) if (c[j].low <= v) { ok = false; break; }
    if (ok) for (let j = m + 1; j <= m + right; j++) if (c[j].low <= v) { ok = false; break; }
    if (ok) out[i] = v;
  }
  return out;
}

export function hsn(c: Candle[]): { markers: MK[]; levelLines: LL[]; boxes: BX[]; hlines: HL[] } {
  const n = c.length;
  if (n < 60) return { markers: [], levelLines: [], boxes: [], hlines: [] };
  const close = c.map((x) => x.close);

  // ---- Supply & Demand: pivot anchor + ATR-sized band, kept while unmitigated ----
  const SENS = 8, WIDTH = 4.0;
  const sdAtr = atr(c, 50);
  const ph = pivHigh(c, SENS, SENS), pl = pivLow(c, SENS, SENS);
  const supply: BX[] = [], demand: BX[] = [];
  for (let i = SENS * 2; i < n; i++) {
    const mid = i - SENS, thick = (sdAtr[mid] || 0) * WIDTH / 15;
    if (thick <= 0) continue;
    if (!Number.isNaN(ph[i])) {
      const top = ph[i], bottom = top - thick;
      let hit = false; for (let k = i + 1; k < n; k++) if (close[k] >= top) { hit = true; break; }
      if (!hit) supply.push({ time: c[mid].time, top, bottom, rgb: "242,54,69" });
    }
    if (!Number.isNaN(pl[i])) {
      const bottom = pl[i], top = bottom + thick;
      let hit = false; for (let k = i + 1; k < n; k++) if (close[k] <= bottom) { hit = true; break; }
      if (!hit) demand.push({ time: c[mid].time, top, bottom, rgb: "8,153,129" });
    }
  }
  const boxes = [...supply.slice(-5), ...demand.slice(-5)];

  // ---- Nearest support / resistance from longer pivots ----
  const SR = 10;
  const srPh = pivHigh(c, SR, SR), srPl = pivLow(c, SR, SR);
  let resistance = NaN, support = NaN;
  for (let i = 0; i < n; i++) { if (!Number.isNaN(srPh[i])) resistance = srPh[i]; if (!Number.isNaN(srPl[i])) support = srPl[i]; }
  const hlines: HL[] = [];
  if (!Number.isNaN(resistance)) hlines.push({ price: resistance, color: "#f23645", title: `R ${resistance.toFixed(2)}`, dashed: true });
  if (!Number.isNaN(support)) hlines.push({ price: support, color: "#089981", title: `S ${support.toFixed(2)}`, dashed: true });

  // ---- SuperTrend-style signal (hl2 ± mult·ATR trailing bands) ----
  const MULT = 3.2, AP = 40;
  const sigAtr = atr(c, AP);
  const upper = new Array(n).fill(NaN), lower = new Array(n).fill(NaN), trend = new Array(n).fill(1);
  for (let i = 0; i < n; i++) {
    const src = (c[i].high + c[i].low) / 2, a = sigAtr[i];
    const rawU = src - MULT * a, rawL = src + MULT * a;
    const pc = i > 0 ? close[i - 1] : NaN;
    const puN = i > 0 && !Number.isNaN(upper[i - 1]) ? upper[i - 1] : rawU;
    const plN = i > 0 && !Number.isNaN(lower[i - 1]) ? lower[i - 1] : rawL;
    upper[i] = !Number.isNaN(pc) && pc > puN ? Math.max(rawU, puN) : rawU;
    lower[i] = !Number.isNaN(pc) && pc < plN ? Math.min(rawL, plN) : rawL;
    const pt = i > 0 ? trend[i - 1] : 1;
    trend[i] = pt === -1 && close[i] > lower[i - 1] ? 1 : pt === 1 && close[i] < upper[i - 1] ? -1 : pt;
  }
  const sigMarks: MK[] = [];
  for (let i = 1; i < n; i++) {
    if (trend[i] === 1 && trend[i - 1] === -1) sigMarks.push({ time: c[i].time, text: "BUY", up: true, color: "#049108" });
    if (trend[i] === -1 && trend[i - 1] === 1) sigMarks.push({ time: c[i].time, text: "SELL", up: false, color: "#bb0303" });
  }
  // Trailing-stop line, split into trend-coloured segments.
  const levelLines: LL[] = [];
  let seg: { time: number; value: number }[] = [], st = NaN;
  for (let i = 0; i < n; i++) {
    const v = trend[i] === 1 ? upper[i] : lower[i];
    if (Number.isNaN(v)) continue;
    if (seg.length && trend[i] !== st) { levelLines.push({ color: st === 1 ? "#049108" : "#bb0303", dashed: false, points: seg }); seg = []; }
    st = trend[i]; seg.push({ time: c[i].time, value: v });
  }
  if (seg.length > 1) levelLines.push({ color: st === 1 ? "#049108" : "#bb0303", dashed: false, points: seg });

  // ---- RSI reversal markers (overbought / oversold crosses) ----
  const r = rsi(close, 14), rsiMarks: MK[] = [];
  for (let i = 1; i < n; i++) {
    if (Number.isNaN(r[i]) || Number.isNaN(r[i - 1])) continue;
    if (r[i - 1] <= 75 && r[i] > 75) rsiMarks.push({ time: c[i].time, text: "OB", up: false, color: "#f23645" });
    if (r[i - 1] >= 25 && r[i] < 25) rsiMarks.push({ time: c[i].time, text: "OS", up: true, color: "#22c55e" });
  }

  return { markers: [...sigMarks.slice(-16), ...rsiMarks.slice(-12)], levelLines, boxes, hlines };
}
