// Buy/sell signal overlay from the Lab's logistic-regression model. Trains on the
// chart's own candles and only marks the OUT-OF-SAMPLE region (bars the model
// never trained on). EXPERIMENTAL, EDUCATIONAL — a probability study, not advice:
// price-only models sit near a coin-flip and usually lose after costs.
import type { Candle } from "@/components/PriceChart";
import { train, predict } from "@/lib/sim/model";

type MK = { time: number; text: string; up: boolean; color: string };

export function modelSignals(c: Candle[], thr = 0.55): { markers: MK[]; testAcc: number | null } {
  const m = train(c);
  if (!m) return { markers: [], testAcc: null };
  const markers: MK[] = [];
  let state = 0; // -1 sell, 0 neutral, 1 buy — only mark on a change of state
  for (let i = m.trainEnd; i < c.length - 1; i++) {
    const p = predict(m, c, i);
    const sig = p >= thr ? 1 : p <= 1 - thr ? -1 : 0;
    if (sig !== 0 && sig !== state) {
      const conf = Math.round((sig === 1 ? p : 1 - p) * 100);
      markers.push({ time: c[i].time, text: `${sig === 1 ? "BUY" : "SELL"} ${conf}%`, up: sig === 1, color: sig === 1 ? "#22c55e" : "#ef4444" });
      state = sig;
    }
  }
  return { markers: markers.slice(-20), testAcc: m.testAcc };
}
