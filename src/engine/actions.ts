import type { ReasonCode, Severity, SignalAction } from "../types.js";

export function severityForMove(absMovementPct: number): Severity {
  if (absMovementPct >= 35) return "critical";
  if (absMovementPct >= 25) return "high";
  if (absMovementPct >= 15) return "medium";
  return "low";
}

export function confidenceFor(reasonCode: ReasonCode, absMovementPct: number): number {
  const base: Record<ReasonCode, number> = {
    SHARP_ODDS_MOVEMENT: 72,
    CONSENSUS_SHIFT: 78,
    NO_SCORE_CHANGE_MOVE: 86,
    POST_EVENT_MOVE: 68,
    MARKET_REVERSAL: 82,
    HIGH_CONFIDENCE_ANOMALY: 94,
  };
  return Math.min(99, base[reasonCode] + Math.floor(Math.max(0, absMovementPct - 15) / 3));
}

/**
 * Deterministic action policy. AI explanations may describe the choice, but never choose it.
 */
export function decideAction(input: {
  reasonCode: ReasonCode;
  severity: Severity;
  confidence: number;
  direction: "up" | "down";
}): SignalAction {
  if (input.reasonCode === "HIGH_CONFIDENCE_ANOMALY") return "ALERT";
  if (input.reasonCode === "MARKET_REVERSAL" && input.confidence >= 82) return "FADE";
  if (input.reasonCode === "NO_SCORE_CHANGE_MOVE" && input.confidence >= 85) return "FOLLOW";
  if (input.severity === "critical" || input.severity === "high") return "ALERT";
  return "WATCH";
}
