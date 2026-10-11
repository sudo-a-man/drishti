"use client";
import React, { useState } from "react";

export function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
type BtnSize = "sm" | "md" | "lg";
const BTN: Record<BtnVariant, string> = {
  primary: "bg-grad-accent text-on-accent shadow-glow hover:brightness-110",
  secondary: "bg-surface-2 text-text border border-border hover:border-border-strong hover:bg-surface-3",
  ghost: "bg-transparent text-text-muted hover:bg-surface hover:text-text",
  danger: "bg-danger text-on-accent hover:brightness-110",
};
const SIZE: Record<BtnSize, string> = { sm: "h-9 px-3.5 text-sm", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-[0.95rem]" };

export function Button({
  variant = "primary",
  size = "md",
  loading,
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize; loading?: boolean }) {
  return (
    <button
      aria-busy={loading || undefined}
      disabled={rest.disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition duration-150 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100",
        BTN[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    >
      {loading && <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
}

export function Field({ label, error, hint, id, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  const fid = id || label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fid} className="text-sm font-medium text-text">{label}</label>
      <input
        id={fid}
        aria-invalid={!!error}
        aria-describedby={error ? `${fid}-err` : undefined}
        className={cn(
          "h-10 rounded-md bg-surface px-3 text-base text-text placeholder:text-text-muted border",
          error ? "border-danger" : "border-border-input",
        )}
        {...rest}
      />
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      {error && <p id={`${fid}-err`} role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-border bg-surface shadow-card", className)} {...rest} />;
}

export function Badge({ tone = "muted", children }: { tone?: "muted" | "buy" | "sell" | "hold" | "accent"; children: React.ReactNode }) {
  const map = {
    muted: "bg-surface-2 text-text-muted",
    buy: "bg-surface-2 text-success",
    sell: "bg-surface-2 text-danger",
    hold: "bg-surface-2 text-text-muted",
    accent: "bg-surface-2 text-accent-text",
  } as const;
  return <span className={cn("inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-semibold", map[tone])}>{children}</span>;
}

export function Tabs({ tabs, value, onChange }: { tabs: { id: string; label: string }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div role="tablist" aria-label="Index" className="flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "whitespace-nowrap px-3 py-2 text-sm font-medium -mb-px border-b-2",
            value === t.id ? "border-accent text-text" : "border-transparent text-text-muted hover:text-text",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function SignalPill({ signal }: { signal: "buy" | "sell" | "hold" }) {
  const label = { buy: "Buy", sell: "Sell", hold: "Hold" }[signal];
  return <Badge tone={signal}>{label}</Badge>;
}

export function RatingMeter({ rating, golden }: { rating: number; golden?: boolean }) {
  const pct = (rating + 100) / 2; // 0..100
  const tone = rating > 0 ? "var(--color-success)" : rating < 0 ? "var(--color-danger)" : "var(--color-text-muted)";
  return (
    <div className="flex items-center gap-2" role="meter" aria-valuemin={-100} aria-valuemax={100} aria-valuenow={rating} aria-label="Stock meter rating">
      <div className="relative h-2 w-28 rounded-pill bg-surface-2">
        <div className="absolute left-1/2 top-0 h-2 w-px bg-border" />
        <div className="absolute top-0 h-2 rounded-pill" style={{ width: `${Math.min(50, Math.abs(pct - 50))}%`, left: rating >= 0 ? "50%" : undefined, right: rating < 0 ? "50%" : undefined, background: tone }} />
      </div>
      <span className="w-10 text-right font-mono text-sm tabular-nums" style={{ color: tone }}>{rating > 0 ? "+" : ""}{rating}</span>
      {golden && <Badge tone="accent">Golden</Badge>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-surface-2", className)} />;
}

export function SignInGate({ tool }: { tool: string }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="flex max-w-sm flex-col gap-3 p-6 text-center shadow-pop">
        <h2 className="text-lg font-semibold">Sign in to use {tool}</h2>
        <p className="text-sm text-text-muted">Create a free account to open the live board.</p>
        <div className="flex justify-center gap-2">
          <a href="/signup"><Button>Sign up</Button></a>
          <a href="/login"><Button variant="secondary">Sign in</Button></a>
        </div>
      </Card>
    </div>
  );
}

export function useTick(ms = 15000) {
  const [, set] = useState(0);
  React.useEffect(() => {
    const id = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}
