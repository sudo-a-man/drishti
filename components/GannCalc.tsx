"use client";
import { useState } from "react";
import { Card, Button, Badge } from "@/components/ui";
import { gannSquare9, nearestStrike } from "@/lib/gann";

const INDEXES = [
  { id: "nifty", label: "Nifty 50", step: 50 },
  { id: "banknifty", label: "Bank Nifty", step: 100 },
  { id: "sensex", label: "Sensex", step: 100 },
];

const fmt = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

function Row({ tone, deg, cardinal, value, step }: { tone: "sell" | "buy"; deg: number; cardinal: boolean; value: number; step: number }) {
  const color = tone === "sell" ? "text-danger" : "text-success";
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <span className="flex items-center gap-2">
        <Badge tone={tone}>{deg}°</Badge>
        {cardinal && <span className="text-[10px] uppercase tracking-wide text-text-muted">cardinal</span>}
      </span>
      <span className={`font-mono tabular-nums ${color}`}>
        {fmt(value)} <span className="text-text-muted">→ {fmt(nearestStrike(value, step))}</span>
      </span>
    </div>
  );
}

export default function GannCalc({ initialPrice = 0 }: { initialPrice?: number }) {
  const [priceStr, setPriceStr] = useState(initialPrice ? String(initialPrice) : "");
  const [index, setIndex] = useState("sensex");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const price = Number(priceStr);
  const step = INDEXES.find((i) => i.id === index)?.step ?? 100;
  const valid = price > 0;
  const levels = valid ? gannSquare9(price) : [];
  const resist = [...levels].reverse(); // 360° → 45° (far to near, shown above the price)

  async function useSpot() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/options?u=${index}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not load spot");
      setPriceStr(String(j.spot));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="gann-price" className="text-sm font-medium text-text">Price / strike</label>
            <input
              id="gann-price"
              inputMode="decimal"
              value={priceStr}
              onChange={(e) => setPriceStr(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="e.g. 72472"
              className="h-10 w-40 rounded-md border border-border-input bg-surface px-3 text-base text-text placeholder:text-text-muted"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="gann-index" className="text-sm font-medium text-text">Index · strike step</label>
            <select
              id="gann-index"
              value={index}
              onChange={(e) => setIndex(e.target.value)}
              className="h-10 rounded-md border border-border-input bg-surface px-3 text-sm text-text"
            >
              {INDEXES.map((i) => <option key={i.id} value={i.id}>{i.label} · {i.step}</option>)}
            </select>
          </div>
          <Button variant="secondary" onClick={useSpot} loading={loading}>Use live spot</Button>
        </div>
        {err && <p className="mt-2 text-xs text-danger">{err}</p>}
        {valid && (
          <p className="mt-3 text-xs text-text-muted">
            √{fmt(price)} = {Math.sqrt(price).toFixed(4)} · level = (√price ± degrees/180)² · one 360° turn ≈ +2 on the root.
            Each level is mapped to the nearest tradable strike (step {step}). Reference levels, not advice.
          </p>
        )}
      </Card>

      {valid ? (
        <Card className="p-0">
          <div className="flex flex-col divide-y divide-border text-sm">
            <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-danger">Resistance (above)</div>
            {resist.map((l) => <Row key={`r${l.degrees}`} tone="sell" deg={l.degrees} cardinal={l.cardinal} value={l.resistance} step={step} />)}
            <div className="flex items-center justify-between bg-surface-2 px-4 py-2.5 font-semibold">
              <span className="text-accent-text">Base price</span>
              <span className="font-mono tabular-nums text-accent-text">{fmt(price)} <span className="text-text-muted">→ {fmt(nearestStrike(price, step))}</span></span>
            </div>
            {levels.map((l) => <Row key={`s${l.degrees}`} tone="buy" deg={l.degrees} cardinal={l.cardinal} value={l.support} step={step} />)}
            <div className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-success">Support (below)</div>
          </div>
        </Card>
      ) : (
        <Card className="p-4 text-sm text-text-muted">Enter a price or strike (or tap &quot;Use live spot&quot;) to see its Gann Square of 9 support and resistance levels.</Card>
      )}
    </div>
  );
}
