// Volume-driven liquidity zones ("order blocks").
// A candle whose volume dwarfs the recent average marks where institutions
// transacted. The zone is that candle's body; it stays active (and keeps
// extending right) until a later candle CLOSES through it — then it's "cut"
// and dropped. Pure math, no signals.

export type VolCandle = { time: number; open: number; high: number; low: number; close: number; volume?: number };
export type Zone = { time: number; top: number; bottom: number; bullish: boolean };

function avgVol(candles: VolCandle[], from: number, to: number): number {
  const w = candles.slice(from, to).filter((x) => x.volume);
  if (w.length < 5) return 0;
  return w.reduce((a, x) => a + (x.volume ?? 0), 0) / w.length;
}

export function isHighVolume(candles: VolCandle[], i: number, mult = 2, lookback = 20): boolean {
  const vol = candles[i]?.volume ?? 0;
  if (!vol) return false;
  const avg = avgVol(candles, Math.max(0, i - lookback), i);
  return avg > 0 && vol >= mult * avg;
}

export function liquidityZones(candles: VolCandle[], opts?: { mult?: number; lookback?: number; max?: number }): Zone[] {
  const mult = opts?.mult ?? 2;
  const lookback = opts?.lookback ?? 20;
  const max = opts?.max ?? 6;
  const zones: Zone[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (!isHighVolume(candles, i, mult, lookback)) continue;
    const c = candles[i];
    const top = Math.max(c.open, c.close);
    const bottom = Math.min(c.open, c.close);
    const bullish = c.close >= c.open;
    // Dropped once a later candle closes beyond the zone (the zone is "cut").
    let cut = false;
    for (let j = i + 1; j < candles.length; j++) {
      if (bullish ? candles[j].close < bottom : candles[j].close > top) { cut = true; break; }
    }
    if (!cut) zones.push({ time: c.time, top, bottom, bullish });
  }
  return zones.slice(-max);
}
