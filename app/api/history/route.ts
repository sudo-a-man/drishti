import { type NextRequest, NextResponse } from "next/server";
import { fyersHistory } from "@/lib/feed/fyersHistory";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const symbol = sp.get("symbol");
  const res = sp.get("res") || "D";
  const days = Math.min(365, Math.max(1, Number(sp.get("days") || 120)));
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  try {
    const candles = await fyersHistory(symbol, res, days);
    if (!candles) return NextResponse.json({ error: "Connect Fyers to load charts (visit /api/fyers/login)." }, { status: 503 });
    return NextResponse.json({ symbol, resolution: res, candles });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
