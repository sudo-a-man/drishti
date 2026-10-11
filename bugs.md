# Bugs — Lumetra

Build: local (demo mode, fake data)  Date: 2026-10-10

**No S1/S2/S3/S4 bugs reproduced in the testable (demo-mode) scope.** Driven live in a browser: the core board loop (F05 — bullish/bearish ranking, meter, sector flow, Δrank), the free-tool sign-in gate (F02), mobile layout at 390px, and the login demo path (F04) all rendered correctly with **0 console errors** and **0 failed (5xx) requests**.

## To check (blocked — needs your keys or unbuilt screens; NOT reproduced bugs)

- **Real auth end-to-end** — email sign-up + confirmation, Google OAuth, wrong-password error. Needs Supabase + Google keys.
- **Payment end-to-end** — Razorpay test card `4111 1111 1111 1111` (success) and a failing card, then webhook → `subscriptions.status = active`. Needs Razorpay test keys. (Verify the webhook is idempotent on Razorpay's retry.)
- **Second-user RLS isolation** — sign in as user B, confirm you can read none of user A's rows. Needs a live DB.
- **Email delivery** — Resend from your domain. Needs domain + key.
- **Lead capture (F03), course, journal, option-sentiment screens** — not built yet.
- **Market-data correctness** — synthetic until the licensed feed + worker exist.
- **axe a11y scan** — authored in the specs but not yet run headless; run it and fix any violations in the tokens/components, not per-screen.

## Fix log

Nothing to fix in scope yet. When the blocked cases run and surface issues, log them here in `bug-report.md` format (ID, severity, steps, expected, actual, evidence, fixing commit).
