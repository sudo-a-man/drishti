import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { INSTRUMENTS, type Side } from "@/lib/fakeData";

const BASE = "https://api-t1.fyers.in";
const TOKEN_FILE = path.join(process.cwd(), ".fyers-token.json");
export const FYERS_REDIRECT = process.env.FYERS_REDIRECT_URI || "http://127.0.0.1:3000/api/fyers/callback";

export function fyersConfigured(): boolean {
  return Boolean(process.env.FYERS_APP_ID && process.env.FYERS_SECRET_ID);
}

export function fyersAuthUrl(state = "lumetra"): string {
  const p = new URLSearchParams({
    client_id: process.env.FYERS_APP_ID ?? "",
    redirect_uri: FYERS_REDIRECT,
    response_type: "code",
    state,
  });
  return `${BASE}/api/v3/generate-authcode?${p.toString()}`;
}

export async function exchangeAuthCode(code: string) {
  const appIdHash = crypto
    .createHash("sha256")
    .update(`${process.env.FYERS_APP_ID}:${process.env.FYERS_SECRET_ID}`)
    .digest("hex");
  const res = await fetch(`${BASE}/api/v3/validate-authcode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grant_type: "authorization_code", appIdHash, code }),
  });
  const json = await res.json();
  if (json.s !== "ok" || !json.access_token) throw new Error(json.message || "Fyers token exchange failed");
  await fs.writeFile(
    TOKEN_FILE,
    JSON.stringify({ access_token: json.access_token, refresh_token: json.refresh_token ?? null, at: Date.now() }),
    "utf8",
  );
  return json;
}

async function readToken(): Promise<string | null> {
  try {
    const t = JSON.parse(await fs.readFile(TOKEN_FILE, "utf8"));
    return t.access_token ?? null;
  } catch {
    return null;
  }
}

export async function fyersConnected(): Promise<boolean> {
  return (await readToken()) !== null;
}

export async function fyersAccessToken(): Promise<string | null> {
  return readToken();
}

export async function fyersTokenInfo(): Promise<{ connected: boolean; at: number | null }> {
  try {
    const t = JSON.parse(await fs.readFile(TOKEN_FILE, "utf8"));
    return { connected: Boolean(t.access_token), at: typeof t.at === "number" ? t.at : null };
  } catch {
    return { connected: false, at: null };
  }
}

type BaseRow = {
  symbol: string; name: string; sector: string; ltp: number; changePct: number;
  rating: number; signal: "buy" | "sell" | "hold"; goldenZone: boolean; bull: number; bear: number;
};

let cache: { at: number; rows: BaseRow[] } | null = null;

async function allRows(token: string): Promise<BaseRow[]> {
  if (cache && Date.now() - cache.at < 20000) return cache.rows;
  const symbols = INSTRUMENTS.map((i) => `NSE:${i.symbol}-EQ`).join(",");
  const res = await fetch(`${BASE}/data/quotes?symbols=${encodeURIComponent(symbols)}`, {
    headers: { Authorization: `${process.env.FYERS_APP_ID}:${token}` },
  });
  const json = await res.json();
  if (json.s !== "ok" || !Array.isArray(json.d)) throw new Error(json.message || "Fyers quotes failed");
  const q = new Map<string, any>();
  for (const row of json.d) {
    const sym = String(row.n || "").replace("NSE:", "").replace("-EQ", "");
    q.set(sym, row.v || {});
  }
  const rows = INSTRUMENTS.map((i) => {
    const v = q.get(i.symbol) || {};
    const chp = Number(v.chp ?? v.chng_per ?? 0);
    const ltp = Number(v.lp ?? v.ltp ?? 0);
    const rating = Math.max(-100, Math.min(100, Math.round(chp * 20)));
    const signal: BaseRow["signal"] = rating > 25 ? "buy" : rating < -25 ? "sell" : "hold";
    return {
      symbol: i.symbol, name: i.name, sector: i.sector, ltp,
      changePct: Number(chp.toFixed(2)), rating, signal,
      goldenZone: Math.abs(rating) > 70, bull: Math.max(0, rating), bear: Math.max(0, -rating),
    };
  });
  cache = { at: Date.now(), rows };
  return rows;
}

export async function fyersBoardPayload(side: Side) {
  const token = await readToken();
  if (!token) return null;
  try {
    const all = await allRows(token);
    const rows = all
      .filter((x) => (side === "bull" ? x.rating > 0 : x.rating < 0))
      .sort((a, b) => (side === "bull" ? b.rating - a.rating : a.rating - b.rating))
      .map((x, idx) => ({ ...x, rank: idx + 1, prevRank: idx + 1 }))
      .slice(0, 20);
    const bySector = new Map<string, number[]>();
    all.forEach((x) => bySector.set(x.sector, [...(bySector.get(x.sector) ?? []), x.rating]));
    const sectors = [...bySector.entries()]
      .map(([sector, r]) => ({ sector, avgStrength: Math.round(r.reduce((a, b) => a + b, 0) / r.length), leading: false }))
      .sort((a, b) => b.avgStrength - a.avgStrength);
    if (sectors.length) sectors[0].leading = true;
    const breadth = { bull: all.filter((x) => x.rating > 0).length, bear: all.filter((x) => x.rating < 0).length };
    return { source: "fyers", side, rows, sectors, breadth };
  } catch (e) {
    console.error("[fyers] board error:", (e as Error).message);
    return null;
  }
}
