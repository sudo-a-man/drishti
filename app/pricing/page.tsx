import Link from "next/link";
import { Button, Card, Badge } from "@/components/ui";

const tiers = [
  { name: "Watch", who: "Trying it out", price: "₹0", period: "free", features: ["The board, meter & scanner", "A free account, no card", "Delayed / limited data"] },
  { name: "Trader", who: "Active, month to month", price: "₹999", period: "/ month", tag: "Most flexible", features: ["Full live board & zones", "Trading journal", "Cancel in one tap"], highlight: true },
  { name: "Committed", who: "All-in for the year", price: "₹7,999", period: "/ year", tag: "~33% off monthly", features: ["Everything in Trader", "Best price", "7-day cooling-off"] },
];

function Check() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        <h1 className="font-display text-4xl font-bold tracking-tight">Simple pricing. Start free.</h1>
        <p className="mx-auto mt-3 max-w-xl text-text-muted">Upgrade only if it earns its place. Cancel in one tap, no year locked up front. (Prices are a demo.)</p>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {tiers.map((t) => (
          <Card key={t.name} className={`relative flex flex-col gap-4 p-6 ${t.highlight ? "shadow-glow" : ""}`} style={t.highlight ? { borderColor: "var(--color-accent)" } : undefined}>
            {t.tag && <span className="absolute right-5 top-6"><Badge tone="accent">{t.tag}</Badge></span>}
            <div>
              <h2 className="font-display text-lg font-semibold">{t.name}</h2>
              <p className="text-xs text-text-muted">{t.who}</p>
            </div>
            <div className="flex items-end gap-1">
              <span className="font-display text-4xl font-bold">{t.price}</span>
              <span className="pb-1 text-sm text-text-muted">{t.period}</span>
            </div>
            <ul className="flex flex-col gap-2.5 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="mt-0.5 text-accent-text"><Check /></span>
                  <span className="text-text-muted">{f}</span>
                </li>
              ))}
            </ul>
            <Link href="/signup" className="mt-auto">
              <Button variant={t.highlight ? "primary" : "secondary"} className="w-full">
                {t.name === "Watch" ? "Start free" : "Get started"}
              </Button>
            </Link>
          </Card>
        ))}
      </div>
      <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-text-muted">
        Billing is honest by design: a clear renewal email 3 days before any charge, one-tap cancel that stops the next renewal, and a 7-day cooling-off refund on a new subscription.
      </p>
    </div>
  );
}
