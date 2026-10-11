import { NextResponse } from "next/server";
import { fyersConfigured, fyersTokenInfo } from "@/lib/feed/fyers";

// Lightweight status for the "Live data · Fyers" panel.
export const dynamic = "force-dynamic";

export async function GET() {
  const info = await fyersTokenInfo();
  return NextResponse.json({ configured: fyersConfigured(), connected: info.connected, at: info.at });
}
