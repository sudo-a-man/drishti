// Ports of user-provided TradingView Pine scripts into TypeScript indicators that
// render on PriceChart (crypto + F&O). Each returns overlay primitives
// (levelLines / markers). Descriptive studies — not advice.
import type { Candle, Marker, LevelLine } from "@/components/PriceChart";

type Out = { levelLines: LevelLine[]; markers: Marker[] };

const col = (xs: Candle[], k: "open" | "high" | "low" | "close") => xs.map((c) => c[k]);
const vols = (xs: Candle[]) => xs.map((c) => c.volume ?? 0);

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

const linePts = (xs: Candle[], ser: number[]) => xs.map((c, i) => ({ time: c.time, value: ser[i] })).filter((p) => !Number.isNaN(p.value));

// 1) Wyckoff Box & Signals — range box (support/resistance) + Spring/Upthrust
//    traps and Secondary Tests, with an optional volume filter.
export function wyckoff(c: Candle[], lookback = 20, useVol = true, volMult = 1.5, stWindow = 15): Out {
  const n = c.length;
  const res = new Array(n).fill(NaN), sup = new Array(n).fill(NaN);
  for (let i = lookback; i < n; i++) {
    let hi = -Infinity, lo = Infinity;
    for (let j = i - lookback; j <= i - 1; j++) { hi = Math.max(hi, c[j].high); lo = Math.min(lo, c[j].low); }
    res[i] = hi; sup[i] = lo;
  }
  const v = vols(c), avg = smaSeries(v, lookback);
  const markers: Marker[] = [];
  let sLow = NaN, sVol = NaN, sBar = -1, sFired = true;
  let uHigh = NaN, uVol = NaN, uBar = -1, uFired = true;
  for (let i = 0; i < n; i++) {
    if (Number.isNaN(res[i])) continue;
    const o = c[i].open, h = c[i].high, l = c[i].low, cl = c[i].close, hl2 = (h + l) / 2;
    const lowVol = v[i] < avg[i], climax = v[i] > avg[i] * volMult;
    const spring = l < sup[i] && cl > sup[i] && cl > o;
    const upthr = h > res[i] && cl < res[i] && cl < o;
    const vSpring = spring && (!useVol || lowVol || (climax && cl > hl2));
    const vUpthr = upthr && (!useVol || lowVol || (climax && cl < hl2));
    if (vSpring) { sLow = l; sVol = v[i]; sBar = i; sFired = false; markers.push({ time: c[i].time, text: "BUY", up: true, color: "#22c55e" }); }
    if (vUpthr) { uHigh = h; uVol = v[i]; uBar = i; uFired = false; markers.push({ time: c[i].time, text: "SELL", up: false, color: "#ef4444" }); }
    const rh = res[i] - sup[i];
    const sinceS = i - sBar;
    if (!sFired && sinceS >= 2 && sinceS <= stWindow && l >= sLow && l <= sup[i] + rh * 0.2 && cl > o && v[i] < sVol) {
      sFired = true; markers.push({ time: c[i].time, text: "ST BUY", up: true, color: "#4ade80" });
    }
    const sinceU = i - uBar;
    if (!uFired && sinceU >= 2 && sinceU <= stWindow && h <= uHigh && h >= res[i] - rh * 0.2 && cl < o && v[i] < uVol) {
      uFired = true; markers.push({ time: c[i].time, text: "ST SELL", up: false, color: "#f87171" });
    }
  }
  return {
    markers,
    levelLines: [
      { color: "rgba(239,68,68,0.5)", points: linePts(c, res) },
      { color: "rgba(132,204,22,0.5)", points: linePts(c, sup) },
    ],
  };
}

// 2) Swift AlgoX — EMA(fast/slow) crossover with a trend-MA and higher-EMA
//    filter, drawn as an indicator (EMAs + BUY/SELL on confirmed crossovers).
//    Note: the Pine used a 60m HTF EMA via request.security; here the trend
//    filter is approximated with a long EMA on the current timeframe.
export function algoX(c: Candle[], fast = 9, slow = 21, trendLen = 50, htfLen = 200): Out {
  const close = col(c, "close");
  const f = emaSeries(close, fast), s = emaSeries(close, slow), t = smaSeries(close, trendLen), htf = emaSeries(close, htfLen);
  const markers: Marker[] = [];
  for (let i = 1; i < c.length; i++) {
    if ([f[i], s[i], t[i], htf[i], f[i - 1], s[i - 1]].some(Number.isNaN)) continue;
    const crossUp = f[i - 1] <= s[i - 1] && f[i] > s[i];
    const crossDn = f[i - 1] >= s[i - 1] && f[i] < s[i];
    const bull = f[i] > s[i] && c[i].close > t[i] && c[i].close > htf[i];
    const bear = f[i] < s[i] && c[i].close < t[i] && c[i].close < htf[i];
    if (crossUp && bull) markers.push({ time: c[i].time, text: "BUY", up: true, color: "#16a34a" });
    if (crossDn && bear) markers.push({ time: c[i].time, text: "SELL", up: false, color: "#dc2626" });
  }
  return {
    markers,
    levelLines: [
      { color: "#2dd4bf", points: linePts(c, f) },
      { color: "#f59e0b", points: linePts(c, s) },
      { color: "#9ca3af", points: linePts(c, t) },
      { color: "#eab308", points: linePts(c, htf) },
    ],
  };
}

// 3) Candlestick patterns — engulfing / hammer / shooting star / marubozu with
//    an SMA(20) trend filter; marks BUY/SELL with the pattern name.
export function candlePatterns(c: Candle[]): Out {
  const ma = smaSeries(col(c, "close"), 20);
  const markers: Marker[] = [];
  for (let i = 1; i < c.length; i++) {
    if (Number.isNaN(ma[i])) continue;
    const o = c[i].open, h = c[i].high, l = c[i].low, cl = c[i].close, po = c[i - 1].open, pc = c[i - 1].close;
    const body = Math.abs(cl - o), upW = h - Math.max(o, cl), loW = Math.min(o, cl) - l, rng = h - l;
    const up = cl > ma[i], dn = cl < ma[i];
    let text = "", dir = 0;
    if (dn && pc < po && cl > o && cl > po && o < pc) { text = "Bull Engulf"; dir = 1; }
    else if (up && pc > po && cl < o && cl < po && o > pc) { text = "Bear Engulf"; dir = -1; }
    else if (dn && cl > o && loW >= body * 2 && upW <= body * 0.2) { text = "Hammer"; dir = 1; }
    else if (up && o > cl && upW >= body * 2 && loW <= body * 0.2) { text = "Shooting Star"; dir = -1; }
    else if (cl > o && body > rng * 0.95) { text = "Bull Marubozu"; dir = 1; }
    else if (o > cl && body > rng * 0.95) { text = "Bear Marubozu"; dir = -1; }
    if (dir === 1) markers.push({ time: c[i].time, text, up: true, color: "#22c55e" });
    else if (dir === -1) markers.push({ time: c[i].time, text, up: false, color: "#ef4444" });
  }
  return { markers, levelLines: [] };
}


