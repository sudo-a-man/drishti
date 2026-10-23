// Killzones / trading sessions — shaded by the session's high/low range over its
// time window, per ICT (New York time) or Indian market hours (IST). Intraday
// only. Descriptive study, not advice.
import type { Candle } from "@/components/PriceChart";

export type Session = { name: string; start: number; end: number; color: string }; // start/end = minutes from local midnight
export type KZInstance = { name: string; color: string; start: number; end: number; hi: number; lo: number };
type LL = { color: string; dashed: boolean | undefined; points: { time: number; value: number }[] };
type MK = { time: number; text: string; up: boolean; color: string };

// ICT killzones in New York time (the LuxAlgo toolkit uses a fixed UTC-5).
export const ICT_SESSIONS: Session[] = [
  { name: "Asia", start: 20 * 60, end: 24 * 60, color: "#e91e63" },      // 20:00–00:00
  { name: "London", start: 2 * 60, end: 5 * 60, color: "#00bcd4" },      // 02:00–05:00
  { name: "NY AM", start: 8 * 60 + 30, end: 11 * 60, color: "#ff5d00" }, // 08:30–11:00
  { name: "NY PM", start: 13 * 60 + 30, end: 16 * 60, color: "#2157f3" },// 13:30–16:00
];
export const ICT_TZ = -300; // UTC-5, minutes

// Indian intraday sessions in IST (UTC+5:30).
export const INDIA_SESSIONS: Session[] = [
  { name: "Opening", start: 9 * 60 + 15, end: 10 * 60 + 15, color: "#ff5d00" }, // 09:15–10:15
  { name: "Mid-day", start: 11 * 60 + 30, end: 13 * 60 + 30, color: "#00bcd4" },// 11:30–13:30
  { name: "Power hour", start: 14 * 60 + 30, end: 15 * 60 + 30, color: "#2157f3" }, // 14:30–15:30
];
export const INDIA_TZ = 330; // UTC+5:30, minutes

export function killzones(c: Candle[], sessions: Session[], tzOffsetMin: number, maxInstances = 12): { levelLines: LL[]; markers: MK[]; instances: KZInstance[] } {
  const insts: KZInstance[] = [];
  for (const s of sessions) {
    let inRun = false, hi = -Infinity, lo = Infinity, startT = 0, endT = 0;
    const flush = () => { if (inRun && endT > startT) insts.push({ name: s.name, color: s.color, start: startT, end: endT, hi, lo }); inRun = false; hi = -Infinity; lo = Infinity; };
    for (let i = 0; i < c.length; i++) {
      const localMin = (((Math.floor(c[i].time / 60) + tzOffsetMin) % 1440) + 1440) % 1440;
      if (localMin >= s.start && localMin < s.end) {
        if (!inRun) { inRun = true; startT = c[i].time; hi = c[i].high; lo = c[i].low; }
        else { hi = Math.max(hi, c[i].high); lo = Math.min(lo, c[i].low); }
        endT = c[i].time;
      } else flush();
    }
    flush();
  }
  insts.sort((a, b) => a.start - b.start);
  const levelLines: LL[] = [];
  const markers: MK[] = [];
  const shown = insts.slice(-maxInstances);
  const labeled = new Set<string>();
  // Draw newest → oldest so only the most recent instance of each session keeps a
  // text label; older instances still get their high/low band, without the clutter
  // of the same "Opening" / "Mid-day" label repeating on every day.
  for (let k = shown.length - 1; k >= 0; k--) {
    const z = shown[k];
    levelLines.push({ color: z.color, dashed: undefined, points: [{ time: z.start, value: z.hi }, { time: z.end, value: z.hi }] });
    levelLines.push({ color: z.color, dashed: undefined, points: [{ time: z.start, value: z.lo }, { time: z.end, value: z.lo }] });
    if (!labeled.has(z.name)) { markers.push({ time: z.start, text: z.name, up: false, color: z.color }); labeled.add(z.name); }
  }
  return { levelLines, markers, instances: shown };
}
