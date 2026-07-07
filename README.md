# SharpLine

SharpLine is a production-grade autonomous sports market intelligence platform for the TxLINE Autonomous Agents Track. It is not a betting app and not an odds dashboard: it watches live TxLINE data, detects significant market movement with deterministic rules, explains signals with Groq when available, stores the full trail in Supabase, and presents a professional trading-desk dashboard.

## Architecture

TxLINE live feed → TypeScript worker → deterministic signal engine → Groq explanation layer → Supabase → Next.js dashboard.

## Strategy and deterministic rules

The signal engine evaluates odds ticks in a 10-minute rolling window. A signal fires when absolute movement is at least 15%.

Reason codes:
- `SHARP_ODDS_MOVEMENT`: baseline significant move.
- `CONSENSUS_SHIFT`: 20%+ move after score change context.
- `NO_SCORE_CHANGE_MOVE`: significant move while score is unchanged.
- `POST_EVENT_MOVE`: move within three minutes of a goal/card-style impact event.
- `MARKET_REVERSAL`: direction reverses inside the window and finishes 18%+ away from the original price.
- `HIGH_CONFIDENCE_ANOMALY`: 30%+ move with no score change or recent impact event.

Actions are deterministic: high-confidence anomalies become `ALERT`, strong reversals become `FADE`, no-score high-confidence moves become `FOLLOW`, high/critical moves become `ALERT`, and all remaining valid signals become `WATCH`. AI never decides.

## Supabase schema

Run `supabase/schema.sql`. Core tables are:
- `matches`
- `odds_snapshots`
- `market_signals`
- `signal_resolutions`
- `agent_runs`

Legacy worker tables (`fixtures`, `odds_ticks`, `score_events`, `signals`) may still be used by earlier dashboard components, but the production pipeline writes the new hackathon schema.

## Environment

Copy `.env.example` to `.env` and fill in Supabase and TxLINE settings. `GROQ_API_KEY` is optional; without it SharpLine stores deterministic fallback explanations and never fakes AI output.

## TxLINE endpoints

The worker consumes TxLINE snapshots and SSE streams through the existing client modules:
- fixtures snapshot via `src/txline/client.ts`
- odds stream via `/api/odds/stream`
- scores stream via `/api/scores/stream`

## Commands

```bash
npm install
npm run typecheck
npm run worker
npm run demo
```

For the dashboard:

```bash
cd sharpline-web
npm install
npm run build
npm run dev
```

## Demo mode

`npm run demo` is clearly labeled DEMO MODE. It simulates realistic odds events, writes demo matches/snapshots/signals to Supabase, generates at least five meaningful deterministic signals, and marks every row with `is_demo = true`.

## Hackathon demo flow

1. Show the architecture and deterministic action policy.
2. Run `npm run demo` when live matches are unavailable.
3. Open the dashboard and point out the DEMO MODE label.
4. Drill into latest signals: movement, reason code, action, confidence, and Groq/fallback explanation.
5. Explain how `signal_resolutions` supports historical accuracy, confidence performance, and ROI-style analytics.
