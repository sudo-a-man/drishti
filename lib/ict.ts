import type { Candle } from "./sim/agent";

// Original implementations of two core ICT ideas (fair value gaps and order
// blocks), drawn as rectangle zones. Generic concepts, written fresh, not a
// port of any vendor's script. Descriptive price zones, not advice.
export type Box = { time: number; top: number; bottom: number; rgb: string };

const BULL_FVG = "6,182,212"; // cyan
const BEAR_FVG = "249,115,22"; // orange
const BULL_OB = "62,137,250"; // blue
const BEAR_OB = "255,49,49"; // red

// A 3-candle imbalance: bar i gaps away from bar i-2. Kept while still unfilled.
export function fairValueGaps(c: Candle[], max = 12): Box[] {
  const out: Box[] = [];
  for (let i = 2; i < c.length; i++) {
    if (c[i].low > c[i - 2].high) {
      const top = c[i].low, bottom = c[i - 2].high;
      let filled = false;
      for (let k = i + 1; k < c.length; k++) if (c[k].low < bottom) { filled = true; break; }
      if (!filled) out.push({ time: c[i - 2].time, top, bottom, rgb: BULL_FVG });
    } else if (c[i].high < c[i - 2].low) {
      const top = c[i - 2].low, bottom = c[i].high;
      let filled = false;
      for (let k = i + 1; k < c.length; k++) if (c[k].high > top) { filled = true; break; }
      if (!filled) out.push({ time: c[i - 2].time, top, bottom, rgb: BEAR_FVG });
    }
  }
  return out.slice(-max);
}

// The last opposing candle before a candle closes through its range. Kept until
// a later close breaks back through it.
export function orderBlocks(c: Candle[], max = 6): Box[] {
  const out: Box[] = [];
  for (let i = 1; i < c.length - 1; i++) {
    const down = c[i].close < c[i].open, up = c[i].close > c[i].open;
    if (down && c[i + 1].close > c[i + 1].open && c[i + 1].close > c[i].high) {
      let broken = false;
      for (let k = i + 2; k < c.length; k++) if (c[k].close < c[i].low) { broken = true; break; }
      if (!broken) out.push({ time: c[i].time, top: c[i].high, bottom: c[i].low, rgb: BULL_OB });
    } else if (up && c[i + 1].close < c[i + 1].open && c[i + 1].close < c[i].low) {
      let broken = false;
      for (let k = i + 2; k < c.length; k++) if (c[k].close > c[i].high) { broken = true; break; }
      if (!broken) out.push({ time: c[i].time, top: c[i].high, bottom: c[i].low, rgb: BEAR_OB });
    }
  }
  return out.slice(-max);
}
