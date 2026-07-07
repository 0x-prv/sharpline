export type Severity = "low" | "medium" | "high" | "critical";
export type SignalAction = "WATCH" | "ALERT" | "FOLLOW" | "FADE";
export type ReasonCode =
  | "SHARP_ODDS_MOVEMENT"
  | "CONSENSUS_SHIFT"
  | "NO_SCORE_CHANGE_MOVE"
  | "POST_EVENT_MOVE"
  | "MARKET_REVERSAL"
  | "HIGH_CONFIDENCE_ANOMALY";

export type MatchState = {
  fixtureId: string;
  match: string;
  homeScore: number;
  awayScore: number;
  lastScoreChangeAt?: number;
  lastImpactEvent?: string;
  isDemo?: boolean;
};

export type MarketSignal = {
  fixtureId: string;
  match: string;
  market: string;
  selection: string;
  previousOdds: number;
  currentOdds: number;
  movementPct: number;
  direction: "up" | "down";
  severity: Severity;
  confidence: number;
  reasonCode: ReasonCode;
  action: SignalAction;
  explanation: string;
  aiProvider: "groq" | "fallback";
  occurredAt: string;
  isDemo: boolean;
};

export type OddsEvent = {
  fixtureId: string;
  match: string;
  market: string;
  selection: string;
  price: number;
  ts: number;
  homeScore: number;
  awayScore: number;
  isDemo?: boolean;
};
