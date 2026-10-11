#!/usr/bin/env node
/**
 * Market-data worker (SYNTHETIC placeholder).
 * Every minute it writes one snapshot per instrument into `stock_snapshots`.
 * To go live, replace `syntheticRow()` with a client for your LICENSED feed
 * (Zerodha Kite / Upstox / Angel One / Dhan, or TrueData / GlobalDatafeeds) and
 * map its quotes + your own scoring into the same columns. Nothing else changes.
 *
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/worker.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const rnd = () => Math.random() * 2 - 1;

function syntheticRow(instrumentId, ts) {
  const rating = Math.round(rnd() * 100);
  const changePct = Number((rnd() * 3).toFixed(2));
  return {
    instrument_id: instrumentId,
    ts,
    change_pct: changePct,
    rating,
    signal: rating > 25 ? "buy" : rating < -25 ? "sell" : "hold",
    golden_zone: Math.abs(rating) > 70,
    bull_power: Math.max(0, rating),
    bear_power: Math.max(0, -rating),
  };
}

async function tick() {
  const { data: instruments, error } = await db.from("instruments").select("id");
  if (error) return console.error("instruments:", error.message);
  if (!instruments?.length) return console.log("no instruments — run supabase/seed.sql first");
  const ts = new Date();
  ts.setSeconds(0, 0);
  const rows = instruments.map((i) => syntheticRow(i.id, ts.toISOString()));
  const { error: upErr } = await db.from("stock_snapshots").upsert(rows, { onConflict: "instrument_id,ts" });
  console.log(new Date().toISOString(), upErr ? "error: " + upErr.message : `wrote ${rows.length} snapshots`);
}

tick();
setInterval(tick, 60_000);
