import { type NextRequest, NextResponse } from "next/server";

// Candlesticks from CoinDCX public market data (no key needed). Normalises to the
// shape PriceChart expects: time in SECONDS, ascending, de-duplicated.
export const dynamic = "force-dynamic";

const BASE = "https://public.coindcx.com/market_data/candles";

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const pair = sp.get("pair") || "B-XAUT_USDT";
  const interval = sp.get("interval") || "1d";
  const limit = Math.min(1000, Math.max(10, Number(sp.get("limit") || 300)));

  try {
    const res = await fetch(
      `${BASE}?pair=${encodeURIComponent(pair)}&interval=${encodeURIComponent(interval)}&limit=${limit}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`CoinDCX candles ${res.status}`);
    const raw = (await res.json()) as Array<{ open: number; high: number; low: number; close: number; volume: number; time: number }>;
    const seen = new Set<number>();
    const candles = raw
      .map((c) => ({ time: Math.floor(c.time / 1000), open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume }))
      .sort((a, b) => a.time - b.time)
      .filter((c) => (seen.has(c.time) ? false : (seen.add(c.time), true)));
    return NextResponse.json({ pair, interval, candles });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "Could not load candles." }, { status: 502 });
  }
}
