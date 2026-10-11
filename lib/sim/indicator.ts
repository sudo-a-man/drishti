import type { Candle } from "./agent";

// Opening Range study, adapted from ChrisMoody's _CM_Opening-Range script.
// The original marks forex Asia/Europe sessions in US Eastern time. Here it is
// anchored to the NSE session in IST: open 9:15, close 15:30. The opening range
// is the first `orMinutes` after 9:15, and PT1/PT2 bands project off it exactly
// as the script does. Intraday only; descriptive price levels, not advice.
export type Sig = { long: boolean; short: boolean };
export type ORLevels = {
  orHigh: (number | null)[]; orLow: (number | null)[];
  pt1Up: (number | null)[]; pt1Low: (number | null)[];
  pt2Up: (number | null)[]; pt2Low: (number | null)[];
};
export type ORMarker = { time: number; pt: 1 | 2; up: boolean };
export type ORSegment = { tStart: number; tEnd: number; orHigh: number; orLow: number; pt1Up: number; pt1Low: number; pt2Up: number; pt2Low: number };

const IST = 19800; // +5:30 in seconds
const SESSION_OPEN = 9 * 60 + 15; // 9:15 IST, in minutes past IST midnight
const SESSION_CLOSE = 15 * 60 + 30; // 15:30 IST
const dayKey = (t: number) => Math.floor((t + IST) / 86400);
const istMinute = (t: number) => Math.floor(((t + IST) % 86400) / 60);

export function openingRange(c: Candle[], orMinutes = 60, pt1 = 0.5, pt2 = 1.0): { levels: ORLevels; markers: ORMarker[]; segments: ORSegment[] } {
  const n = c.length;
  const blank = () => Array<number | null>(n).fill(null);
  const L: ORLevels = { orHigh: blank(), orLow: blank(), pt1Up: blank(), pt1Low: blank(), pt2Up: blank(), pt2Low: blank() };
  const markers: ORMarker[] = [];
  const segments: ORSegment[] = [];
  const orEndMin = SESSION_OPEN + orMinutes;
  let i = 0;
  while (i < n) {
    const day = dayKey(c[i].time);
    let j = i;
    while (j < n && dayKey(c[j].time) === day) j++;
    // Opening range = session bars from 9:15 up to 9:15 + orMinutes.
    let hi = -Infinity, lo = Infinity;
    for (let k = i; k < j; k++) { const mm = istMinute(c[k].time); if (mm >= SESSION_OPEN && mm <= orEndMin) { hi = Math.max(hi, c[k].high); lo = Math.min(lo, c[k].low); } }
    const range = hi - lo;
    if (range > 0 && isFinite(range)) {
      const p1u = hi + range * pt1, p1l = lo - range * pt1, p2u = hi + range * pt2, p2l = lo - range * pt2;
      let hit1 = false, hit2 = false, firstPost = -1, lastPost = -1;
      for (let k = i; k < j; k++) {
        const mm = istMinute(c[k].time);
        if (mm <= orEndMin || mm > SESSION_CLOSE) continue; // only the post-range part of the session
        L.orHigh[k] = hi; L.orLow[k] = lo; L.pt1Up[k] = p1u; L.pt1Low[k] = p1l; L.pt2Up[k] = p2u; L.pt2Low[k] = p2l;
        if (firstPost < 0) firstPost = k;
        lastPost = k;
        if (!hit1 && (c[k].high >= p1u || c[k].low <= p1l)) { markers.push({ time: c[k].time, pt: 1, up: c[k].high >= p1u }); hit1 = true; }
        if (!hit2 && (c[k].high >= p2u || c[k].low <= p2l)) { markers.push({ time: c[k].time, pt: 2, up: c[k].high >= p2u }); hit2 = true; }
      }
      if (firstPost >= 0) segments.push({ tStart: c[firstPost].time, tEnd: c[lastPost].time, orHigh: hi, orLow: lo, pt1Up: p1u, pt1Low: p1l, pt2Up: p2u, pt2Low: p2l });
    }
    i = j;
  }
  return { levels: L, markers, segments };
}

// Opening-range breakout for the lab: long on the first close above the day's
// OR high, short on the first close below the OR low.
export function computeSignals(c: Candle[], orMinutes = 60): Sig[] {
  const { levels } = openingRange(c, orMinutes);
  const out: Sig[] = c.map(() => ({ long: false, short: false }));
  let prevDay = -1, firedLong = false, firedShort = false;
  for (let k = 0; k < c.length; k++) {
    const d = dayKey(c[k].time);
    if (d !== prevDay) { prevDay = d; firedLong = false; firedShort = false; }
    const h = levels.orHigh[k], l = levels.orLow[k];
    if (h !== null && !firedLong && c[k].close > h) { out[k].long = true; firedLong = true; }
    else if (l !== null && !firedShort && c[k].close < l) { out[k].short = true; firedShort = true; }
  }
  return out;
}
