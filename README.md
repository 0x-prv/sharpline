# SharpLine

SharpLine is a production-grade autonomous sports market intelligence platform for the TxLINE Autonomous Agents Track. It is not a betting app and not an odds dashboard: it watches live TxLINE data, detects significant market movement with deterministic rules, explains signals with Groq when available, stores the full trail in Supabase, and presents a professional trading-desk dashboard.

## Architecture

TxLINE live feed → TypeScript worker → deterministic signal engine → Groq explanation layer → Supabase → Next.js dashboard.

## Production dashboard is live-first

The deployed dashboard presents SharpLine as a live TxLINE autonomous agent. It defaults to `LIVE`, shows TxLINE as connected or waiting for the next match, and only queries production rows where `is_demo = false` for matches, odds snapshots, market signals, and live performance metrics.

When no live match or live signals are available, the dashboard shows a clean waiting state instead of backfilling with simulated rows. Demo data remains useful for local testing and judge fallback, but it is clearly excluded from the main live dashboard experience.

## Deterministic signal engine

Actions are deterministic: high-confidence anomalies become `ALERT`, strong reversals become `FADE`, no-score high-confidence moves become `FOLLOW`, high/critical moves become `ALERT`, and all remaining valid signals become `WATCH`. AI never decides.

## Supabase schema

The hackathon schema lives in `supabase/schema.sql` and includes:

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

- `src/txline/client.ts`
- `src/txline/stream.ts`
- `src/worker.ts`

## Commands

```bash
npm run typecheck
npm run worker
npm run demo
npm run build --prefix sharpline-web
```

`npm run demo` is retained for local testing and judge fallback when live matches are unavailable. It simulates realistic odds events, writes demo matches/snapshots/signals to Supabase, generates meaningful deterministic signals, and marks every demo row with `is_demo = true`.

## Hackathon live-first flow

1. Start the worker with live TxLINE credentials.
2. Open the dashboard and confirm it shows `LIVE · Connected to TxLINE` or `LIVE · Waiting for next TxLINE match`.
3. If no live match is active, use the waiting states to explain that SharpLine is connected and monitoring TxLINE fixtures.
4. When live odds move, drill into latest signals: movement, reason code, action, confidence, and Groq/fallback explanation.
5. Explain how `signal_resolutions` supports historical accuracy, confidence performance, and ROI-style analytics using live signals only.

## Demo fallback

Demo mode exists only as a local fallback via `npm run demo`. Demo rows are marked with `is_demo = true`, and the main production dashboard filters them out so simulated signals do not appear as live product activity.

## Completed fixture history and replay limits

On worker startup SharpLine loads both upcoming and recently completed TxLINE fixture snapshots, then upserts production rows into `matches` with `is_demo = false`, team names, status, kickoff time, final score, and finish time when TxLINE provides it. Completed matches are shown in Overview, Signals, and Analytics even when no signals were captured.

Replay is built from stored live odds captured while the worker was running. It cannot reconstruct odds history for matches that were completed before SharpLine was deployed. If TxLINE exposes historical odds snapshots for completed fixtures in the future, those snapshots should be persisted to `odds_snapshots` with `is_demo = false`; otherwise SharpLine displays the final result with a clear replay-unavailable message.
