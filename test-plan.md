# Test plan: Lumetra

Build: local (demo mode, fake data)  Date: 2026-10-10  Env: local dev + seed

Flows F01–F05 from `recon.md`. Cases marked **PASS** were driven live in a browser against `localhost:3000`. **BLOCKED** cases need your Supabase/Razorpay keys or screens not built yet — they're listed as "to check" in `bugs.md`, not failures.

| case | flow | type | steps | expected | auto | result |
| --- | --- | --- | --- | --- | --- | --- |
| F05-H1 | daily loop (core) | happy | open /app; read board; click Bearish tab | bullish ranked rows w/ meter+signal; Bearish shows negative/Sell | e2e | PASS |
| F05-E1 | daily loop | edge: mobile 390px | resize, open /app | board scrolls, bottom tab bar shows | e2e | PASS |
| F05-E2 | daily loop | edge: refresh mid-view | reload /app | skeleton → data, no mismatch | e2e | PASS |
| F05-E3 | daily loop | edge: two tabs | open /app twice | same minute data, no error | manual | PASS |
| F05-E4 | daily loop | edge: keyboard + a11y | tab to Bullish/Bearish, Enter | focus ring, tab switches; axe clean | e2e | to run |
| F05-N1 | daily loop | neg: choppy (no setups) | force all-neutral minute | "No bullish setups right now" | manual | to check |
| F02-H1 | free tool (gate) | happy | open /meter signed out | board shell + "Sign in to use Meter" overlay | e2e | PASS |
| F02-E1 | free tool | edge: mobile gate | /meter at 390px | gate card centered, readable | manual | PASS |
| F04-H1 | returning login | happy (demo) | /login, fill, submit | "Demo mode …" alert, stays on page | e2e | PASS |
| F04-H1k | returning login | happy (with keys) | same, keys set | redirect to /app, session cookie | manual | BLOCKED |
| F04-E1 | returning login | edge: empty email | submit blank | HTML required blocks submit | e2e | to run |
| F04-N1 | returning login | neg: wrong password | bad creds, keys set | inline error, no session | manual | BLOCKED |
| F01-H1 | buy genie | happy nav | / → See pricing → Get started | lands on /signup | e2e | PASS |
| F01-E1 | buy genie | edge: unconfigured checkout | POST /api/checkout | 503 "Payments not configured" | e2e | to run |
| F01-N1 | buy genie | neg: checkout w/o auth | POST /api/checkout, keys set | 401 "Sign in first" | manual | BLOCKED |
| F01-Hp | buy genie | happy payment | pay w/ Razorpay test card → webhook | subscription active in DB | manual | BLOCKED |
| F03-H1 | lead capture | happy | /course or /booking, submit lead | lead stored, thank-you | manual | BLOCKED (screens not built) |

## How to run the automated specs

```bash
cd lumetra && npm install && npx playwright install chromium && npm run test:e2e
```

Each spec fails on any console error, any 5xx response, and (where added) axe a11y violations. Start `npm run dev` first (the config reuses a running server).
