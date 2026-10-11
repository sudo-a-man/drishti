// Presentational hero visual only — a styled "live terminal" board.
// No data wiring (core logic stays locked); sample values illustrate the look.
const tiles = [
  { label: "Max pain", value: "24,200", cls: "text-accent-text" },
  { label: "PCR", value: "1.50", cls: "text-text" },
  { label: "Call wall", value: "24,500", cls: "text-danger" },
  { label: "Put wall", value: "24,000", cls: "text-success" },
];
const ticks = [
  { s: "RELIANCE", p: "2,984.20", c: "+1.8%", up: true },
  { s: "HDFCBANK", p: "1,672.55", c: "+0.9%", up: true },
  { s: "INFY", p: "1,540.10", c: "−0.6%", up: false },
  { s: "TATASTEEL", p: "182.35", c: "+2.4%", up: true },
];

export default function HeroBoard() {
  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-6 -z-10 bg-radial-glow blur-2xl" />
      <div className="animate-floaty rounded-xl border border-border-strong bg-bg-elevated/90 p-4 shadow-pop">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulsering rounded-full bg-success" />
            <span className="font-mono text-xs tracking-wide text-text-muted">NIFTY 50 · LIVE</span>
          </div>
          <span className="font-mono text-xs text-text-faint">15:29:58</span>
        </div>

        <svg viewBox="0 0 360 140" className="h-32 w-full" preserveAspectRatio="none" role="img" aria-label="Sample index chart">
          <defs>
            <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c5cff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#7c5cff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7c5cff" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
          <path d="M0,110 L30,98 L60,104 L90,80 L120,88 L150,60 L180,66 L210,44 L240,52 L270,30 L300,38 L330,18 L360,24 L360,140 L0,140 Z" fill="url(#area)" />
          <path
            d="M0,110 L30,98 L60,104 L90,80 L120,88 L150,60 L180,66 L210,44 L240,52 L270,30 L300,38 L330,18 L360,24"
            fill="none" stroke="url(#stroke)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ strokeDasharray: 1000, strokeDashoffset: 1000, animation: "dash 2.4s ease-out forwards" }}
          />
          <circle cx="360" cy="24" r="3.5" fill="#22d3ee" />
        </svg>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-lg border border-border bg-surface px-2.5 py-2">
              <div className="text-[10px] uppercase tracking-wider text-text-faint">{t.label}</div>
              <div className={`font-mono text-sm font-semibold tabular-nums ${t.cls}`}>{t.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
          {ticks.map((t) => (
            <div key={t.s} className="flex items-center justify-between px-3 py-1.5 text-sm">
              <span className="font-medium">{t.s}</span>
              <span className="flex items-center gap-3 font-mono tabular-nums">
                <span className="text-text-muted">{t.p}</span>
                <span className={t.up ? "text-success" : "text-danger"}>{t.c}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
