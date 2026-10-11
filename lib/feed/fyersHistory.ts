import { fyersAccessToken } from "./fyers";

const BASE = "https://api-t1.fyers.in";

export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };

const ymd = (d: Date) => d.toISOString().slice(0, 10);

// Fyers historical candles. resolution: "D" (daily) or minutes ("5","15","60").
// Returns oldest-first, normalized so the UI never touches Fyers' raw shape.
export async function fyersHistory(symbol: string, resolution = "D", days = 120): Promise<Candle[] | null> {
  const token = await fyersAccessToken();
  if (!token) return null;

  const to = new Date();
  const from = new Date(to.getTime() - days * 86400_000);
  const p = new URLSearchParams({
    symbol,
    resolution,
    date_format: "1",
    range_from: ymd(from),
    range_to: ymd(to),
    cont_flag: "1",
  });
  const res = await fetch(`${BASE}/data/history?${p.toString()}`, {
    headers: { Authorization: `${process.env.FYERS_APP_ID}:${token}` },
  });
  const json = await res.json();
  if (json.s !== "ok" || !Array.isArray(json.candles)) throw new Error(json.message || "Fyers history failed");

  // Fyers returns rows of [epochSeconds, open, high, low, close, volume].
  return (json.candles as number[][]).map((c) => ({
    time: c[0], open: c[1], high: c[2], low: c[3], close: c[4], volume: c[5] ?? 0,
  }));
}
