import { type NextRequest, NextResponse } from "next/server";
import { exchangeAuthCode, fyersConfigured } from "@/lib/feed/fyers";

// Manual fallback for the daily Fyers re-auth: paste the auth_code (or the whole
// redirect URL) when the one-click redirect can't return to this origin.
export async function POST(req: NextRequest) {
  if (!fyersConfigured()) {
    return NextResponse.json({ error: "Set FYERS_APP_ID and FYERS_SECRET_ID in .env.local, then restart." }, { status: 503 });
  }
  let code = "";
  try {
    const body = await req.json();
    code = String(body?.code ?? "").trim();
  } catch {
    /* ignore */
  }
  // Accept either a raw auth_code or a pasted redirect URL containing auth_code=...
  const m = code.match(/auth_code=([^&\s]+)/);
  if (m) code = decodeURIComponent(m[1]);
  if (!code) return NextResponse.json({ error: "Paste the auth code (or the full redirect URL)." }, { status: 400 });

  try {
    await exchangeAuthCode(code);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "Exchange failed." }, { status: 502 });
  }
}
