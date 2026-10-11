import { type NextRequest, NextResponse } from "next/server";
import { exchangeAuthCode } from "@/lib/feed/fyers";

// Step 2: Fyers redirects back here with ?auth_code=... — exchange it for an
// access token and store it server-side, then return to the board.
export async function GET(req: NextRequest) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const code = new URL(req.url).searchParams.get("auth_code");
  if (!code) return NextResponse.redirect(`${site}/app?fyers=error`);
  try {
    await exchangeAuthCode(code);
    return NextResponse.redirect(`${site}/app?fyers=connected`);
  } catch {
    return NextResponse.redirect(`${site}/app?fyers=error`);
  }
}
