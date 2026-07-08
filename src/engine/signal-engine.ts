import { confidenceFor, decideAction, severityForMove } from "./actions.js";
import type { MarketSignal, MatchState, OddsEvent, ReasonCode } from "../types.js";

type Tick = { price: number; ts: number; homeScore: number; awayScore: number };
const WINDOW_MS = 10 * 60 * 1000;
const SHARP_THRESHOLD_PCT = 15;
const history = new Map<string, Tick[]>();

function reasonFor(ticks: Tick[], latest: Tick, pct: number, match: MatchState): ReasonCode {
  const abs = Math.abs(pct);
  const oldest = ticks[0];
  const scoreUnchanged = oldest.homeScore === latest.homeScore && oldest.awayScore === latest.awayScore;
  const recentImpact = match.lastScoreChangeAt && latest.ts - match.lastScoreChangeAt <= 3 * 60 * 1000;
  const hadReversal = ticks.length >= 3 && Math.sign(ticks[1].price - oldest.price) !== Math.sign(latest.price - ticks[1].price);

  if (abs >= 30 && scoreUnchanged && !recentImpact) return "HIGH_CONFIDENCE_ANOMALY";
  if (hadReversal && abs >= 18) return "MARKET_REVERSAL";
  if (recentImpact) return "POST_EVENT_MOVE";
  if (scoreUnchanged) return "NO_SCORE_CHANGE_MOVE";
  if (abs >= 20) return "CONSENSUS_SHIFT";
  return "SHARP_ODDS_MOVEMENT";
}

export function detectMarketSignal(event: OddsEvent, match: MatchState): Omit<MarketSignal, "explanation" | "aiProvider"> | null {
  const key = `${event.fixtureId}:${event.market}:${event.selection}`;
  const cutoff = event.ts - WINDOW_MS;
  const ticks = (history.get(key) ?? []).filter((tick) => tick.ts >= cutoff);
  const latest = { price: event.price, ts: event.ts, homeScore: event.homeScore, awayScore: event.awayScore };
  ticks.push(latest);
  history.set(key, ticks);
  if (ticks.length < 2) return null;

  const oldest = ticks[0];
  const movementPct = ((event.price - oldest.price) / oldest.price) * 100;
  const abs = Math.abs(movementPct);
  if (abs < SHARP_THRESHOLD_PCT) return null;

  const reasonCode = reasonFor(ticks, latest, movementPct, match);
  const severity = severityForMove(abs);
  const confidence = confidenceFor(reasonCode, abs);
  const direction = movementPct > 0 ? "up" : "down";
  const action = decideAction({ reasonCode, severity, confidence, direction });
  history.set(key, [latest]);

  return {
    fixtureId: event.fixtureId,
    competition: "FIFA World Cup 2026",
    match: event.match,
    market: event.market,
    selection: event.selection,
    previousOdds: oldest.price,
    currentOdds: event.price,
    movementPct,
    direction,
    severity,
    confidence,
    reasonCode,
    action,
    occurredAt: new Date(event.ts).toISOString(),
    currentMatchState: `${event.homeScore}-${event.awayScore}`,
    pendingResolution: true,
    isDemo: Boolean(event.isDemo),
  };
}

export function resetSignalEngine() {
  history.clear();
}
