import { type NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { supabaseAdmin, SUPABASE_URL } from "@/lib/supabase/server";

// Razorpay webhook: the source of truth for subscription status.
// Verifies the signature, is idempotent, and updates the DB with the service role.
export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !SUPABASE_URL) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const raw = await req.text();
  const sig = req.headers.get("x-razorpay-signature") ?? "";
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  const event = JSON.parse(raw);
  const eventId = event?.id ?? req.headers.get("x-razorpay-event-id");
  const admin = supabaseAdmin();

  // Idempotency guard. A dedicated webhook_events(id pk) table is the robust
  // store (see backend.md); record-and-skip-if-seen.
  if (eventId) {
    const { error: dup } = await admin.from("webhook_events").insert({ id: eventId, provider: "razorpay" });
    if (dup && dup.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
  }

  if (event.event === "payment.captured" || event.event === "order.paid") {
    const payment = event.payload?.payment?.entity ?? {};
    const notes = payment.notes ?? {};
    const userId: string | undefined = notes.userId;
    const product: string = notes.product ?? "genie";
    const planYears = Number(notes.planYears ?? 1);
    if (userId) {
      const now = new Date();
      const expires = new Date(now);
      expires.setFullYear(expires.getFullYear() + planYears);
      await admin.from("subscriptions").insert({
        user_id: userId,
        product,
        plan_years: planYears,
        amount_paise: payment.amount ?? 0,
        currency: "INR",
        status: "active",
        started_at: now.toISOString(),
        expires_at: expires.toISOString(),
        razorpay_payment_id: payment.id,
      });
      await admin.from("transactions").insert({
        user_id: userId,
        amount_paise: payment.amount ?? 0,
        currency: "INR",
        product,
        status: "paid",
        razorpay_payment_id: payment.id,
      });
    }
  }

  if (event.event === "subscription.cancelled") {
    const sub = event.payload?.subscription?.entity;
    if (sub?.id) await admin.from("subscriptions").update({ status: "cancelled" }).eq("razorpay_subscription_id", sub.id);
  }

  return NextResponse.json({ ok: true, eventId });
}
