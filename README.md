# Lumetra

Real-time F&O market analytics for Indian traders. Live option flow, max pain, support and resistance walls, Gann levels, and charts with liquidity zones. Analytics, not advice.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS with CSS-variable design tokens (dark + light mode)
- Supabase (auth + Postgres)
- Fyers API for live market data
- lightweight-charts for candlestick charts

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000. Add your keys to `.env.local` (copy `.env.example`): the Supabase URL and anon key, plus your Fyers app id and secret. Then authorize Fyers once at `/api/fyers/login`.

## Features

- **Genie board**: every F&O stock scored and ranked each minute, with bull and bear leaders, market breadth and sector flow.
- **Max Pain**: option-chain analytics, with max pain, PCR, and the call and put walls.
- **Gann Square of 9**: support and resistance levels mapped to the nearest tradable strike.
- **Charts**: candles with liquidity zones, volume bubbles and levels, for indices and option strikes.
- **Meter, Scanner, Pullers & Draggers**: strength and breadth views.

## Data

`lib/fakeData.ts` is a synthetic, deterministic fallback used when a live feed isn't connected. Everything here is market analytics for education only. Nothing is investment advice, and trading derivatives carries a high risk of loss.
