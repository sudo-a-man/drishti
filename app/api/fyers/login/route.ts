import { NextResponse } from "next/server";
import { fyersAuthUrl, fyersConfigured } from "@/lib/feed/fyers";

// Step 1 of connecting Fyers: send the user to Fyers to authorize (read-only).
export async function GET() {
  if (!fyersConfigured()) {
    return NextResponse.json(
      { error: "Set FYERS_APP_ID and FYERS_SECRET_ID in .env.local, then restart." },
      { status: 503 },
    );
  }
  return NextResponse.redirect(fyersAuthUrl());
}
