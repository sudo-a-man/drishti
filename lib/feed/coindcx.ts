// CoinDCX crypto feed. Public market data (ticker) needs no key; authenticated
// balances use the API key + secret via an HMAC-signed request. The strength
// rating is derived from the 24h change and is descriptive only — not advice.
import crypto from "node:crypto";

const TICKER_URL = "https://api.coindcx.com/exchange/ticker";
const BALANCES_URL = "https://api.coindcx.com/exchange/v1/users/balances";
const TTL = 15_000;

export type Quote = "INR" | "USDT";

export type CryptoRow = {
  rank: number;
  market: string;
  base: string;
  last: number;
  changePct: number;
  high: number;
  low: number;
  volume: number;
  rating: number;
  signal: "buy" | "sell" | "hold";
};

type Ticker = {
  market: string;
  last_price: string;
  volume: string;
  high: string;
  low: string;
  change_24_hour: string;
};

const cache = new Map<Quote, { at: number; rows: CryptoRow[] }>();

export async function cryptoBoard(
  quote: Quote,
  limit = 25,
): Promise<{ quote: Quote; rows: CryptoRow[]; updatedAt: number }> {
  const hit = cache.get(quote);
  if (hit && Date.now() - hit.at < TTL) return { quote, rows: hit.rows, updatedAt: hit.at };

  const res = await fetch(TICKER_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`CoinDCX ticker ${res.status}`);
  const all = (await res.json()) as Ticker[];

  const rows = all
    .filter((t) => typeof t.market === "string" && t.market.endsWith(quote))
    .map((t) => {
      const base = t.market.slice(0, t.market.length - quote.length);
      const changePct = Number(t.change_24_hour) || 0;
      const rating = Math.max(-100, Math.min(100, Math.round(changePct * 10)));
      return {
        market: t.market,
        base,
        last: Number(t.last_price) || 0,
        changePct: Number(changePct.toFixed(2)),
        high: Number(t.high) || 0,
        low: Number(t.low) || 0,
        volume: Number(t.volume) || 0,
        rating,
        signal: (rating > 25 ? "buy" : rating < -25 ? "sell" : "hold") as CryptoRow["signal"],
        rank: 0,
      };
    })
    .filter((r) => r.base.length > 0 && r.last > 0)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, limit)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  const at = Date.now();
  cache.set(quote, { at, rows });
  return { quote, rows, updatedAt: at };
}

export function coindcxConfigured(): boolean {
  return Boolean(process.env.COINDCX_API_KEY && process.env.COINDCX_API_SECRET);
}

export type Balance = { currency: string; balance: number; locked: number };

// Authenticated: reads the account's balances (read-only). Server-only.
export async function cryptoBalances(): Promise<Balance[]> {
  const key = process.env.COINDCX_API_KEY;
  const secret = process.env.COINDCX_API_SECRET;
  if (!key || !secret) throw new Error("CoinDCX keys not set");

  const body = JSON.stringify({ timestamp: Date.now() });
  const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const res = await fetch(BALANCES_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-AUTH-APIKEY": key, "X-AUTH-SIGNATURE": signature },
    body,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`CoinDCX balances ${res.status}`);
  const data = (await res.json()) as Array<{ currency: string; balance: string; locked_balance: string }>;
  return data
    .map((b) => ({ currency: b.currency, balance: Number(b.balance) || 0, locked: Number(b.locked_balance) || 0 }))
    .filter((b) => b.balance > 0 || b.locked > 0)
    .sort((a, b) => b.balance + b.locked - (a.balance + a.locked));
}
