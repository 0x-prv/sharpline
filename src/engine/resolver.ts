export type FinalScore = {
  home_h1: number;
  away_h1: number;
  home_total: number;
  away_total: number;
};

type MarketInfo = { type: string; line?: number; half?: number };

function parseMarket(market: string): MarketInfo {
  const parts = market.split(":");
  const type = parts[0];
  let line: number | undefined;
  let half: number | undefined;

  for (const p of parts.slice(1)) {
    if (p.startsWith("line=")) line = parseFloat(p.slice(5));
    if (p.startsWith("half=")) half = parseInt(p.slice(5), 10);
  }

  return { type, line, half };
}

// Compares a value against a single line. 1 = win, -1 = lose, 0 = push.
function evaluateHalfLine(value: number, line: number, higherWins: boolean): 1 | 0 | -1 {
  const diff = higherWins ? value - line : line - value;
  if (Math.abs(diff) < 1e-9) return 0;
  return diff > 0 ? 1 : -1;
}

// Handles whole (-1), half (-1.5), and quarter (-1.25/-1.75) lines.
// Quarter lines are split into two adjacent half-lines and averaged —
// a mixed win/loss result is treated as "push" (not counted toward accuracy),
// which is a simplification but keeps the resolver deterministic and defensible.
function evaluateLine(value: number, line: number, higherWins: boolean): "won" | "lost" | "push" {
  const doubled = line * 2;
  const quadrupled = line * 4;
  const isQuarterLine = Number.isInteger(quadrupled) && !Number.isInteger(doubled);

  if (!isQuarterLine) {
    const result = evaluateHalfLine(value, line, higherWins);
    return result === 1 ? "won" : result === -1 ? "lost" : "push";
  }

  const lower = Math.floor(line * 2) / 2;
  const upper = lower + 0.5;
  const sum = evaluateHalfLine(value, lower, higherWins) + evaluateHalfLine(value, upper, higherWins);

  if (sum > 0) return "won";
  if (sum < 0) return "lost";
  return "push";
}

/**
 * Resolves a single signal's outcome against the fixture's final score.
 * Returns null for unsupported/unrecognized market types (stays "pending").
 *
 * ASSUMPTION: Asian Handicap "line" is expressed from Participant1's perspective
 * (consistent with Participant1IsHome convention seen in TxLINE fixture data).
 */
export function resolveSignal(
  signal: { market: string; selection: string },
  score: FinalScore
): "won" | "lost" | "push" | null {
  const { type, line, half } = parseMarket(signal.market);

  const home = half === 1 ? score.home_h1 : score.home_total;
  const away = half === 1 ? score.away_h1 : score.away_total;

  if (type === "1X2_PARTICIPANT_RESULT") {
    if (signal.selection === "part1") return home > away ? "won" : "lost";
    if (signal.selection === "part2") return away > home ? "won" : "lost";
    if (signal.selection === "draw") return home === away ? "won" : "lost";
    return null;
  }

  if (type === "OVERUNDER_PARTICIPANT_GOALS" && line !== undefined) {
    const total = home + away;
    if (signal.selection === "over") return evaluateLine(total, line, true);
    if (signal.selection === "under") return evaluateLine(total, line, false);
    return null;
  }

  if (type === "ASIANHANDICAP_PARTICIPANT_GOALS" && line !== undefined) {
    const adjustedDiff = home - away + line;
    if (signal.selection === "part1") return evaluateLine(adjustedDiff, 0, true);
    if (signal.selection === "part2") return evaluateLine(-adjustedDiff, 0, true);
    return null;
  }

  return null;
}