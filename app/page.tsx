import Link from "next/link";
import { Button, Card } from "@/components/ui";
import HeroBoard from "@/components/HeroBoard";

const tools = [
  { href: "/app", title: "Genie", tag: "Flagship", desc: "Scores and ranks every F&O stock each minute. Bull and bear leaders, sector flow and breadth, one screen.", span: "md:col-span-2" },
  { href: "/options", title: "Max Pain", tag: "Options", desc: "The option chain, read for you. Max pain, PCR, and the call and put walls that act as resistance and support.", span: "" },
  { href: "/charts", title: "Charts", tag: "Visual", desc: "Candles with liquidity zones, volume bubbles and levels drawn on. Index or any strike.", span: "" },
  { href: "/gann", title: "Gann Square of 9", tag: "Levels", desc: "Square of 9 support and resistance, mapped to the nearest strike you can actually trade.", span: "" },
  { href: "/meter", title: "Meter", tag: "Momentum", desc: "One honest strength score per stock, plus the full breakdown of how it's built.", span: "md:col-span-2" },
];
const steps = [
  { k: "01", title: "Open the board at 9:15", body: "Every F&O stock, scored and ranked for the day. Bull and bear leaders up top." },
  { k: "02", title: "Read the structure", body: "Max pain, PCR, the walls and Gann levels show where price tends to stall or hold." },
  { k: "03", title: "Time it on the chart", body: "Liquidity zones and volume bubbles mark where the big money traded. Index or strike." },
];
const fixes = [
  { title: "Free to start", body: "The board, meter and scanner on a free account. No card needed." },
  { title: "Cancel anytime", body: "Pay monthly, stop whenever. 7 day cooling-off if you change your mind." },
  { title: "Open about the math", body: "Every score shows how it's built. It's a tool, not a tip." },
];
const metrics = [
  { n: "16", l: "F&O stocks scored every minute" },
  { n: "3", l: "indices: Nifty, Bank Nifty, Sensex" },
  { n: "7", l: "tools in one screen" },
  { n: "0", l: "buy/sell calls. Analytics only." },
];
const tiers = [
  { name: "Watch", price: "₹0", unit: "", note: "Board, meter, scanner", cta: "Start free", href: "/signup", featured: false },
  { name: "Trader", price: "₹999", unit: "/mo", note: "Full terminal, live data", cta: "Go Trader", href: "/pricing", featured: true },
  { name: "Committed", price: "₹7,999", unit: "/yr", note: "Everything, best value", cta: "See plans", href: "/pricing", featured: false },
];
const faqs = [
  { q: "Is this tips or advice?", a: "Nope. It's analytics, data not calls, for learning only." },
  { q: "Can I try before paying?", a: "Yes. The free account needs no card." },
  { q: "Do you need my broker login?", a: "Never. You plug in your own data key and it stays yours." },
  { q: "How do I cancel?", a: "One tap in your account. 7 day cooling-off on a new plan." },
];

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-border">
        <div aria-hidden className="absolute inset-0 -z-10 bg-grid [mask-image:radial-gradient(70%_60%_at_50%_0%,#000,transparent)]" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-radial-glow" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <div className="flex flex-col items-start gap-6">
            <span className="animate-rise inline-flex items-center gap-2 rounded-pill border border-border bg-surface/60 px-3 py-1 text-xs text-text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Live data. Free to start.
            </span>
            <h1 className="animate-rise delay-1 max-w-xl font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              See what the market&apos;s <span className="text-gradient">actually doing</span>.
            </h1>
            <p className="animate-rise delay-2 max-w-lg text-lg text-text-muted">
              Lumetra scores every F&amp;O stock every minute and marks the levels that matter (max pain, the walls, liquidity zones, Gann). You open one screen and you&apos;re ready, not forty charts deep.
            </p>
            <div className="animate-rise delay-3 flex flex-wrap gap-3">
              <Link href="/signup"><Button size="lg">Start free</Button></Link>
              <Link href="/app"><Button size="lg" variant="secondary">See the live board</Button></Link>
            </div>
            <div className="animate-rise delay-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-muted">
              <span>No card to start.</span><span className="text-text-faint">·</span><span>Analytics, not tips.</span><span className="text-text-faint">·</span><span>Your broker login stays yours.</span>
            </div>
          </div>
          <div className="animate-rise delay-2"><HeroBoard /></div>
        </div>
      </section>
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden bg-border md:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.l} className="bg-bg px-6 py-8 text-center">
              <div className="font-display text-4xl font-bold text-gradient">{m.n}</div>
              <div className="mt-1 text-xs text-text-muted">{m.l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10 max-w-2xl">
          <div className="mb-2 text-sm font-semibold uppercase tracking-wider text-accent-text">The terminal</div>
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Seven tools. One calm screen.</h2>
          <p className="mt-3 text-text-muted">Each one answers a single question and shows its working. No black boxes, no tips. Just the market, read clearly.</p>
        </div>
        <div className="grid auto-rows-[1fr] gap-4 md:grid-cols-3">
          {tools.map((t) => (
            <Link key={t.href} href={t.href} className={`card-hover group flex flex-col justify-between rounded-xl border border-border bg-surface p-6 ${t.span}`}>
              <div>
                <div className="mb-3 inline-flex items-center rounded-pill border border-border bg-surface-2 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-accent-text">{t.tag}</div>
                <h3 className="font-display text-xl font-semibold">{t.title}</h3>
                <p className="mt-2 text-sm text-text-muted">{t.desc}</p>
              </div>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-text-muted transition-colors group-hover:text-accent-text">Open <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span></span>
            </Link>
          ))}
        </div>
      </section>
      <section className="border-y border-border bg-bg-elevated">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <h2 className="mb-10 font-display text-3xl font-bold tracking-tight md:text-4xl">Open to entry in three steps.</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.k} className="relative rounded-xl border border-border bg-surface p-6">
                <div className="mb-3 font-mono text-sm text-accent-text">{s.k}</div>
                <h3 className="mb-1.5 font-display text-lg font-semibold">{s.title}</h3>
                <p className="text-sm text-text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-10 md:grid-cols-[1fr_1.2fr]">
          <div>
            <div className="mb-2 text-sm font-semibold uppercase tracking-wider text-accent-text">Why Lumetra</div>
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Built like a product. Priced like a tool.</h2>
            <p className="mt-3 text-text-muted">The others want ₹9,999 a year up front for a black box you can&apos;t try. We did the opposite.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {fixes.map((f) => (
              <Card key={f.title} className="card-hover p-5">
                <h3 className="mb-1.5 font-semibold">{f.title}</h3>
                <p className="text-sm text-text-muted">{f.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
      <section className="border-y border-border bg-bg-elevated">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Start free. Pay only if it earns its place.</h2>
            <Link href="/pricing" className="text-sm text-accent-text hover:underline">Compare all plans →</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {tiers.map((t) => (
              <Card key={t.name} className={`relative flex flex-col gap-4 p-6 ${t.featured ? "shadow-glow" : ""}`} style={t.featured ? { borderColor: "var(--color-accent)" } : undefined}>
                {t.featured && <span className="absolute right-5 top-5 rounded-pill bg-grad-accent px-2.5 py-0.5 text-[11px] font-semibold text-on-accent">Popular</span>}
                <div className="text-sm font-semibold text-text-muted">{t.name}</div>
                <div className="font-display text-4xl font-bold">{t.price}<span className="text-base font-medium text-text-muted">{t.unit}</span></div>
                <p className="text-sm text-text-muted">{t.note}</p>
                <Link href={t.href} className="mt-2"><Button variant={t.featured ? "primary" : "secondary"} className="w-full">{t.cta}</Button></Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="mb-8 font-display text-3xl font-bold tracking-tight md:text-4xl">Questions traders ask</h2>
        <div className="divide-y divide-border rounded-xl border border-border bg-surface">
          {faqs.map((f) => (
            <div key={f.q} className="p-5">
              <h3 className="font-semibold">{f.q}</h3>
              <p className="mt-1 text-sm text-text-muted">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-border">
        <div aria-hidden className="absolute inset-0 -z-10 bg-radial-glow" />
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-24 text-center">
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">Give your mornings <span className="text-gradient">back</span>.</h2>
          <p className="max-w-xl text-text-muted">Make a free account and open the live board in under a minute. No card, no broker login, no tips. Just the data.</p>
          <Link href="/signup"><Button size="lg">Create a free account</Button></Link>
          <p className="max-w-xl text-xs text-text-faint">Market analytics for education only. Nothing here is investment advice. Trading in derivatives carries a high risk of loss.</p>
        </div>
      </section>
    </div>
  );
}
