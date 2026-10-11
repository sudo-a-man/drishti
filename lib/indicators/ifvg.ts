// Port of LuxAlgo "Inversion Fair Value Gaps (IFVG)": detect fair value gaps, and
// when price trades fully through one it "inverts" and flips to act as support /
// resistance. We draw the most recent inverted gaps as zones + a BUY/SELL marker
// at the inversion. Simplified from the original; descriptive study, not advice.
import type { Candle } from "@/components/PriceChart";

type Box = { time: number; top: number; bottom: number; rgb: string };
type MK = { time: number; text: string; up: boolean; color: string };

function trueRange(c: Candle[], i: number): number {
  return i === 0 ? c[i].high - c[i].low : Math.max(c[i].high - c[i].low, Math.abs(c[i].high - c[i - 1].close), Math.abs(c[i].low - c[i - 1].close));
}

function atrSeries(c: Candle[], len: number): number[] {
  const out = new Array(c.length).fill(0);
  let prev = NaN;
  for (let i = 0; i < c.length; i++) {
    const tr = trueRange(c, i);
    if (Number.isNaN(prev)) {
      if (i >= len - 1) { let s = 0; for (let j = i - len + 1; j <= i; j++) s += trueRange(c, j); prev = s / len; out[i] = prev; }
    } else { prev = (prev * (len - 1) + tr) / len; out[i] = prev; }
  }
  return out;
}

export function ifvg(c: Candle[], atrMult = 0.25, showLast = 6): { boxes: Box[]; markers: MK[] } {
  const n = c.length;
  const atr = atrSeries(c, Math.min(200, Math.max(14, Math.floor(n / 2))));
  type Inv = { invBar: number; top: number; bottom: number; dir: number };
  const invs: Inv[] = [];
  for (let i = 2; i < n; i++) {
    const a = (atr[i] || 0) * atrMult;
    // bullish FVG (gap up) — inverts when a later close falls below its bottom
    if (c[i].low > c[i - 2].high && c[i - 1].close > c[i - 2].high && c[i].low - c[i - 2].high > a) {
      const top = c[i].low, bot = c[i - 2].high;
      for (let j = i + 1; j < n; j++) if (c[j].close < bot) { invs.push({ invBar: j, top, bottom: bot, dir: -1 }); break; }
    }
    // bearish FVG (gap down) — inverts when a later close rises above its top
    if (c[i].high < c[i - 2].low && c[i - 1].close < c[i - 2].low && c[i - 2].low - c[i].high > a) {
      const top = c[i - 2].low, bot = c[i].high;
      for (let j = i + 1; j < n; j++) if (c[j].close > top) { invs.push({ invBar: j, top, bottom: bot, dir: 1 }); break; }
    }
  }
  invs.sort((x, y) => x.invBar - y.invBar);
  const boxes: Box[] = [];
  const markers: MK[] = [];
  for (const z of invs.slice(-showLast)) {
    boxes.push({ time: c[z.invBar].time, top: z.top, bottom: z.bottom, rgb: z.dir === 1 ? "8,153,129" : "242,54,69" });
    markers.push({ time: c[z.invBar].time, text: z.dir === 1 ? "IFVG BUY" : "IFVG SELL", up: z.dir === 1, color: z.dir === 1 ? "#089981" : "#f23645" });
  }
  return { boxes, markers };
}
