import { type NextRequest, NextResponse } from "next/server";
import { cryptoBoard, type Quote } from "@/lib/feed/coindcx";

// Live crypto board from CoinDCX public market data. No API key required.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("quote");
  const quote: Quote = q === "INR" ? "INR" : "USDT";
  try {
    const data = await cryptoBoard(quote);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Could not load CoinDCX market data." }, { status: 502 });
  }
}
