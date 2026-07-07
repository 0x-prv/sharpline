import "dotenv/config";
import { explainSignal } from "./ai/explain.js";
import { insertAgentRun, insertMarketSignal, insertMatch, insertOddsSnapshot } from "./db/repository.js";
import { detectMarketSignal, resetSignalEngine } from "./engine/signal-engine.js";
import type { MatchState, OddsEvent } from "./types.js";

const base = Date.now();
const match: MatchState = { fixtureId: "demo-arg-fra", match: "Argentina vs France (DEMO)", homeScore: 0, awayScore: 0, isDemo: true };

const events: OddsEvent[] = [
  ["1X2_PARTICIPANT_RESULT", "part1", 2.10, 0], ["1X2_PARTICIPANT_RESULT", "part1", 1.72, 60],
  ["OVERUNDER_PARTICIPANT_GOALS:line=2.5", "over", 1.95, 120], ["OVERUNDER_PARTICIPANT_GOALS:line=2.5", "over", 2.45, 180],
  ["ASIANHANDICAP_PARTICIPANT_GOALS:line=-0.5", "part1", 1.88, 240], ["ASIANHANDICAP_PARTICIPANT_GOALS:line=-0.5", "part1", 1.50, 300],
  ["1X2_PARTICIPANT_RESULT", "draw", 3.20, 360], ["1X2_PARTICIPANT_RESULT", "draw", 4.35, 420],
  ["1X2_PARTICIPANT_RESULT", "part2", 3.10, 480], ["1X2_PARTICIPANT_RESULT", "part2", 2.52, 540],
  ["OVERUNDER_PARTICIPANT_GOALS:line=3.5", "under", 1.80, 600], ["OVERUNDER_PARTICIPANT_GOALS:line=3.5", "under", 2.45, 660],
].map(([market, selection, price, offset]) => ({
  fixtureId: match.fixtureId, match: match.match, market: String(market), selection: String(selection), price: Number(price), ts: base + Number(offset) * 1000, homeScore: match.homeScore, awayScore: match.awayScore, isDemo: true,
}));

async function main() {
  resetSignalEngine();
  await insertAgentRun({ mode: "demo", status: "started", message: "DEMO MODE started; data is simulated and clearly labeled." });
  await insertMatch({ id: match.fixtureId, home_team: "Argentina", away_team: "France", status: "demo", kickoff_at: new Date(base).toISOString(), is_demo: true });

  let signals = 0;
  for (const event of events) {
    if (event.ts >= base + 480_000) {
      match.homeScore = 1;
      match.lastScoreChangeAt = base + 470_000;
      match.lastImpactEvent = "goal";
    }
    event.homeScore = match.homeScore;
    event.awayScore = match.awayScore;
    await insertOddsSnapshot({ fixture_id: event.fixtureId, match: event.match, market: event.market, selection: event.selection, price: event.price, home_score: event.homeScore, away_score: event.awayScore, is_demo: true });
    const detected = detectMarketSignal(event, match);
    if (!detected) continue;
    const ai = await explainSignal(detected);
    await insertMarketSignal({ fixture_id: detected.fixtureId, match: detected.match, market: detected.market, selection: detected.selection, previous_odds: detected.previousOdds, current_odds: detected.currentOdds, movement_pct: detected.movementPct, direction: detected.direction, severity: detected.severity, confidence: detected.confidence, reason_code: detected.reasonCode, action: detected.action, explanation: ai.explanation, ai_provider: ai.aiProvider, is_demo: true });
    signals++;
  }
  await insertAgentRun({ mode: "demo", status: "finished", message: `DEMO MODE finished with ${signals} simulated signals.`, metrics: { signals } });
  console.log(`[demo] generated ${signals} DEMO signals`);
}

main().catch(async (err) => {
  await insertAgentRun({ mode: "demo", status: "failed", message: err.message });
  console.error(err);
  process.exit(1);
});
