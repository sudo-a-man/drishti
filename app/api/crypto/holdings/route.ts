import { NextResponse } from "next/server";
import { cryptoBalances } from "@/lib/feed/coindcx";
import { supabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";

// Owner-only: the CoinDCX key is a single server-side credential, so holdings are
// gated behind a signed-in user. Read-only balances — never places trades.
export const dynamic = "force-dynamic";

export async function GET() {
  if (isSupabaseConfigured()) {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: "Sign in to view holdings." }, { status: 401 });
  }
  try {
    const balances = await cryptoBalances();
    return NextResponse.json({ balances });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "Could not load holdings." }, { status: 502 });
  }
}
