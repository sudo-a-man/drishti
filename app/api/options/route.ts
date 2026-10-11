import { type NextRequest, NextResponse } from "next/server";
import { optionAnalytics } from "@/lib/feed/fyersOptions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const u = new URL(req.url).searchParams.get("u") || "nifty";
  try {
    const data = await optionAnalytics(u);
    if (!data) return NextResponse.json({ error: "Connect Fyers to load option data (visit /api/fyers/login)." }, { status: 503 });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
