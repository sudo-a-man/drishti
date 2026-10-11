import { type NextRequest, NextResponse } from "next/server";
import { checkoutSchema } from "@/lib/validation";
import { supabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";

// Price in paise per product (one year). Multiplied by plan_years.
const PRICE_PAISE: Record<string, number> = {
  genie: 999900,
  course: 399900,
  algorithm: 499900,
  bundle: 1299900,
  commodity: 999900,
};

export async function POST(req: NextRequest) {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return NextResponse.json({ error: "Payments not configured — set Razorpay test keys in .env.local." }, { status: 503 });
  }
  const parsed = checkoutSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  // Must be signed in — subscription is tied to a user.
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const amount = (PRICE_PAISE[parsed.data.product] ?? 999900) * parsed.data.planYears;

  const Razorpay = (await import("razorpay")).default;
  const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  const order = await rzp.orders.create({
    amount,
    currency: "INR",
    notes: { userId: auth.user.id, product: parsed.data.product, planYears: String(parsed.data.planYears) },
  });

  return NextResponse.json({
    orderId: order.id,
    amount,
    currency: "INR",
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  });
}
