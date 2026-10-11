// Port of ChartArt's Moving Average Cross: two MAs (short/long) with a selectable
// calculation (SMA / EMA / WMA / Linear regression) and BUY/SELL on the cross,
// confirmed by close direction. Drawn as the two MA lines + markers. Descriptive
// study, not advice. (Multi-timeframe source from the original is omitted.)
import type { Candle } from "@/components/PriceChart";

type LL = { color: string; dashed: boolean | undefined; points: { time: number; value: number }[] };
type MK = { time: number; text: string; up: boolean; color: string };
export type MAType = "sma" | "ema" | "wma" | "linreg";

function sma(src: number[], len: number): number[] {
  const out = new Array(src.length).fill(NaN); let sum = 0;
  for (let i = 0; i < src.length; i++) { sum += src[i]; if (i >= len) sum -= src[i - len]; if (i >= len - 1) out[i] = sum / len; }
  return out;
}
function ema(src: number[], len: number): number[] {
  const out = new Array(src.length).fill(NaN); const k = 2 / (len + 1); let prev = NaN;
  for (let i = 0; i < src.length; i++) {
    if (Number.isNaN(prev)) { if (i >= len - 1) { let s = 0; for (let j = i - len + 1; j <= i; j++) s += src[j]; prev = s / len; out[i] = prev; } }
    else { prev = src[i] * k + prev * (1 - k); out[i] = prev; }
  }
  return out;
}
function wma(src: number[], len: number): number[] {
  const out = new Array(src.length).fill(NaN); const denom = (len * (len + 1)) / 2;
  for (let i = len - 1; i < src.length; i++) { let acc = 0; for (let w = 0; w < len; w++) acc += src[i - w] * (len - w); out[i] = acc / denom; }
  return out;
}
function linreg(src: number[], len: number): number[] {
  const out = new Array(src.length).fill(NaN);
  for (let i = len - 1; i < src.length; i++) {
    let sx = 0, sy = 0, sxy = 0, sxx = 0;
    for (let w = 0; w < len; w++) { const x = w, y = src[i - len + 1 + w]; sx += x; sy += y; sxy += x * y; sxx += x * x; }
    const b = (len * sxy - sx * sy) / (len * sxx - sx * sx);
    const a = (sy - b * sx) / len;
    out[i] = a + b * (len - 1);
  }
  return out;
}

export function maCross(c: Candle[], shortP = 50, longP = 100, type: MAType = "ema"): { levelLines: LL[]; markers: MK[] } {
  const close = c.map((x) => x.close);
  const calc = (len: number) => (type === "sma" ? sma(close, len) : type === "wma" ? wma(close, len) : type === "linreg" ? linreg(close, len) : ema(close, len));
  const s = calc(shortP), l = calc(longP);
  const markers: MK[] = [];
  for (let i = 1; i < c.length; i++) {
    if ([s[i], l[i], s[i - 1], l[i - 1]].some(Number.isNaN)) continue;
    const up = s[i] > l[i], upPrev = s[i - 1] > l[i - 1];
    if (up && !upPrev && c[i].close > c[i - 1].close) markers.push({ time: c[i].time, text: "BUY", up: true, color: "#22c55e" });
    if (!up && upPrev && c[i].close < c[i - 1].close) markers.push({ time: c[i].time, text: "SELL", up: false, color: "#ef4444" });
  }
  const line = (ser: number[], color: string): LL => ({ color, dashed: false, points: c.map((x, i) => ({ time: x.time, value: ser[i] })).filter((p) => !Number.isNaN(p.value)) });
  return { levelLines: [line(s, "#22d3ee"), line(l, "#f59e0b")], markers: markers.slice(-30) };
}
