// Port of the user's "Swift AlgoX" TradingView strategy into a TypeScript chart
// indicator: EMA(fast/slow) crossover with a trend-MA and higher-EMA filter,
// drawn as EMAs + BUY/SELL on confirmed crossovers. Descriptive study, not advice.
import type { Candle } from "@/components/PriceChart";

type LL = { color: string; dashed: boolean | undefined; points: { time: number; value: number }[] };
type MK = { time: number; text: string; up: boolean; color: string };
type Out = { levelLines: LL[]; markers: MK[] };

const col = (xs: Candle[], k: "open" | "high" | "low" | "close") => xs.map((c) => c[k]);
const linePts = (xs: Candle[], ser: number[]) => xs.map((c, i) => ({ time: c.time, value: ser[i] })).filter((p) => !Number.isNaN(p.value));

function smaSeries(src: number[], len: number): number[] {
  const out = new Array(src.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < src.length; i++) {
    sum += src[i];
    if (i >= len) sum -= src[i - len];
    if (i >= len - 1) out[i] = sum / len;
  }
  return out;
}

function emaSeries(src: number[], len: number): number[] {
  const out = new Array(src.length).fill(NaN);
  const k = 2 / (len + 1);
  let prev = NaN;
  for (let i = 0; i < src.length; i++) {
    if (Number.isNaN(prev)) {
      if (i >= len - 1) { let s = 0; for (let j = i - len + 1; j <= i; j++) s += src[j]; prev = s / len; out[i] = prev; }
    } else { prev = src[i] * k + prev * (1 - k); out[i] = prev; }
  }
  return out;
}

// Note: the Pine original pulls a 60m HTF EMA via request.security; here the
// higher filter is approximated with a long EMA on the current timeframe.
export function algoX(c: Candle[], fast = 9, slow = 21, trendLen = 50, htfLen = 200): Out {
  const close = col(c, "close");
  const f = emaSeries(close, fast), s = emaSeries(close, slow), t = smaSeries(close, trendLen), htf = emaSeries(close, htfLen);
  const markers: MK[] = [];
  for (let i = 1; i < c.length; i++) {
    if ([f[i], s[i], t[i], htf[i], f[i - 1], s[i - 1]].some(Number.isNaN)) continue;
    const crossUp = f[i - 1] <= s[i - 1] && f[i] > s[i];
    const crossDn = f[i - 1] >= s[i - 1] && f[i] < s[i];
    const bull = f[i] > s[i] && c[i].close > t[i] && c[i].close > htf[i];
    const bear = f[i] < s[i] && c[i].close < t[i] && c[i].close < htf[i];
    if (crossUp && bull) markers.push({ time: c[i].time, text: "BUY", up: true, color: "#16a34a" });
    if (crossDn && bear) markers.push({ time: c[i].time, text: "SELL", up: false, color: "#dc2626" });
  }
  const line = (ser: number[], color: string): LL => ({ color, dashed: false, points: linePts(c, ser) });
  return {
    markers: markers.slice(-30),
    levelLines: [line(f, "#2dd4bf"), line(s, "#f59e0b"), line(t, "#9ca3af"), line(htf, "#eab308")],
  };
}
