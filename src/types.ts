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

export type HistoricalComparison = {
  similarSignals: number;
  historicalSuccessRate: number | null;
  averageRoi: number | null;
  examples: Array<{ match: string; market: string; selection: string; outcome: string; roi_units: number; occurred_at: string }>;
};

export type MarketSignal = {
  signalId?: string;
  fixtureId: string;
  competition: string;
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
  historicalComparison?: HistoricalComparison;
  occurredAt: string;
  currentMatchState: string;
  pendingResolution: boolean;
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
