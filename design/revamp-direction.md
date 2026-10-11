# Lumetra — Design Direction: "Terminal Noir"

A research-backed system for an enterprise-grade F&O analytics SaaS.
Core app logic is locked; this governs the visual layer only.

## Research synthesis (what makes premium SaaS feel AAA)

The best-in-class fintech/SaaS products converge on a few disciplines:

- **Restraint + high contrast + whitespace.** Stripe, Linear and Vercel share
  a monochrome base, strong contrast, and hierarchy built from spacing and type
  weight — not from lots of colour. Colour is reserved for meaning.
- **Dark-mode-first, one accent.** Linear/Supabase/Vercel let a single brand
  colour carry the whole console; status colour (green up / red down) is the
  only other colour, and is universal in fintech.
- **Numbers are typeset.** Tabular, right-aligned, monospaced figures so columns
  don't jitter as values tick. "The table is the truth; the chart is a summary."
- **Density done well.** Group into zones separated by whitespace and subtle
  background shifts, not heavy borders. Pass the "squint test": the first thing
  the eye finds should be the thing the user needs first.
- **Trust signals.** Timestamp data, show freshness/"live", design the empty and
  error states with the same care as the happy path. A stale number shown as
  live is a safety bug, not just UX.
- **Landing conversion.** Lead with the product visible early, specific/measurable
  claims, proof near the CTA, and a single obvious primary action.
- **Motion = restraint.** Gentle tick highlights, fade-up on load, skeletons.
  Performance is a design feature — lag reads as untrustworthiness.

Sources: adminlte SaaS dashboard & trading-dashboard teardowns, wandr.studio
fintech trading-dashboard guide, pixeldarts "principles behind Stripe/Linear/
Vercel", designstudiouiux & swipepages 2026 SaaS-landing trends.

## The system

- **Surfaces:** layered near-black — bg `#06080b` → surface `#0e1319` →
  surface-2/3 for elevation. Low-contrast borders (`#1d2630`).
- **Accent:** violet `#7c5cff` → cyan `#22d3ee` gradient. Used for the logo,
  gradient headline text, primary buttons, and focus. Never for body text.
- **State:** success `#22c55e`, danger `#ff5c5c` — gains/losses only, always
  paired with a sign/arrow, never colour alone.
- **Type:** Space Grotesk (display/headings), Inter (body/UI), JetBrains Mono
  (all numbers — tabular). Loaded via `next/font` for zero layout shift.
- **Radii/shadow:** 10–22px radii; soft layered shadows; a violet `shadow-glow`
  for primary/elevated moments only.
- **Motion:** `rise` fade-up (staggered on the hero), `floaty` for the hero
  board, `pulsering` for the live dot, a one-shot stroke draw on charts. All
  disabled under `prefers-reduced-motion`.

## Do / don't

- Do: whitespace, one accent, tabular numerals, honest "analytics not advice".
- Don't: rainbow dashboards, fake testimonials/customer counts, colour-only
  state, decorative charts that don't carry data.
