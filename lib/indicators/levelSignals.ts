// Break/touch signals on the opening-range and session high/low levels: an up
// arrow when price closes up through a resistance level, a down arrow when it
// closes down through a support level. When an option-chain OI context is passed
// (index charts only), each signal is graded by the OI behaviour at the nearest
// strike — a break is "confirmed" when the opposing wall is unwinding there, and
// a likely "fade" when fresh OI is being written against it. Descriptive, not advice.
import type { Candle } from "@/components/PriceChart";

type MK = { time: number; text: string; up: boolean; color: string };
export type SigLevel = { price: number; kind: "high" | "low"; from: number; to: number; label: string };
export type OIContext = { strikes: { strike: number; ceOICh: number; peOICh: number }[] } | null;

export function levelSignals(c: Candle[], levels: SigLevel[], oi: OIContext = null, maxSignals = 14): MK[] {
  const out: MK[] = [];
  const nearest = (p: number) =>
    oi && oi.strikes.length ? oi.strikes.reduce((m, s) => (Math.abs(s.strike - p) < Math.abs(m.strike - p) ? s : m)) : null;

  for (const L of levels) {
    if (!(L.price > 0)) continue;
    for (let i = 1; i < c.length; i++) {
      const t = c[i].time;
      if (t < L.from || t > L.to) continue;
      const brokeUp = L.kind === "high" && c[i - 1].close <= L.price && c[i].close > L.price;
      const brokeDn = L.kind === "low" && c[i - 1].close >= L.price && c[i].close < L.price;
      if (!brokeUp && !brokeDn) continue;
      const up = brokeUp;
      let tag = "", color = up ? "#16a34a" : "#dc2626";
      const k = nearest(L.price);
      if (k) {
        // Up break of resistance is real when calls there are unwinding (ceOICh<0);
        // down break of support is real when puts there are unwinding (peOICh<0).
        const confirm = up ? k.ceOICh < 0 : k.peOICh < 0;
        const against = up ? k.ceOICh > 0 : k.peOICh > 0;
        if (confirm) tag = " ✓";
        else if (against) { tag = " ✗"; color = up ? "#65a30d" : "#f59e0b"; }
      }
      out.push({ time: t, text: `${L.label}${up ? " ▲" : " ▼"}${tag}`, up, color });
      break; // one signal per level — the first break in its window
    }
  }
  out.sort((a, b) => a.time - b.time);
  return out.slice(-maxSignals);
}
