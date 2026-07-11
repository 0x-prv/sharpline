import { connectOddsStream, connectScoresStream } from "./txline/stream.js";
import { getFixturesSnapshot, getScoreUpdates, TXLINE_HISTORICAL_SCORE_UPDATES_ENDPOINT } from "./txline/client.js";
import { checkForSharpMovement } from "./engine/detector.js";
import { classifyMovement } from "./engine/correlator.js";
import { detectMarketSignal, SHARP_THRESHOLD_PCT } from "./engine/signal-engine.js";
import { explainSignal, fallbackExplanation } from "./ai/explain.js";
import type { MatchState } from "./types.js";
import { resolveSignal } from "./engine/resolver.js";
import { anchorSignalMemo } from "./chain/memo.js";
import { saveAnchorTx, saveMarketSignalAnchorTx } from "./db/repository.js";
import {
  upsertFixture,
  insertOddsTick,
  insertScoreEvent,
  insertSignal,
  saveFinalScore,
  getPendingSignals,
  updateSignalOutcome,
  insertMatch,
  insertOddsSnapshot,
  insertMarketSignal,
  upsertAgentState,
  getHistoricalComparison,
  getUnresolvedMarketSignalsForFixture,
  getMatchById,
  resolveMarketSignal,
  markMarketSignalUnsupported,
  getCompletedMatchesWithPendingSignals,
  getStalePastKickoffMatches,
  isTerminalMatchStatus,
  TERMINAL_MATCH_STATUS,
} from "./db/repository.js";
import { ensureTxlineSessionReady } from "./txline/session.js";
import { getSelectedWorldCupServiceLevel } from "./txline/auth.js";
import {
  refreshFixtureWindows,
  isAnyMatchActive,
  msUntilNextWindowChange,
  REFRESH_INTERVAL_MS,
} from "./scheduler.js";

const WORLD_CUP_COMPETITION_ID = 72;
const PRICE_SCALE = 1000;
const MONITOR_INTERVAL_MS = 60 * 1000; // re-check every 1 min whether window ended
const HEARTBEAT_INTERVAL_MS = 20 * 1000;
const RECONCILIATION_INTERVAL_MS = 5 * 60 * 1000;
const STALE_FIXTURE_GRACE_MS = 3 * 60 * 60 * 1000;
const STREAM_RECONNECT_BACKOFF_MS = 5 * 1000;

const counters = {
  fixturesLoaded: 0,
  upcomingFixturesLoaded: 0,
  completedFixturesLoaded: 0,
  eventsProcessed: 0,
  oddsUpdatesProcessed: 0,
  signalsGenerated: 0,
  reconnectCount: 0,
};

let txlineStatus: "connected" | "reconnecting" | "offline" | "waiting" = "waiting";
let workerStatus: "running" | "stopped" | "error" = "running";
let currentState: "monitoring" | "waiting_for_kickoff" | "processing_live_match" = "monitoring";
let activeFixtureId: string | null = null;
let lastTxlineEventAt: string | null = null;

const matchStates = new Map<string, MatchState>();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


function getTotalGoals(score: any, participant: "Participant1" | "Participant2") {
  return score?.[participant]?.Total?.Goals ?? score?.[participant]?.FT?.Goals ?? score?.[participant]?.Goals ?? null;
}

function isCompletedFixture(fixture: any) {
  const state = String(fixture.Status ?? fixture.GameStatus ?? fixture.State ?? fixture.status ?? fixture.gameStatus ?? fixture.state ?? "").toLowerCase();
  const action = String(fixture.Action ?? fixture.action ?? fixture.EventType ?? fixture.eventType ?? "").toLowerCase();
  const gameState = Number(fixture.GameState ?? fixture.gameState);
  const home = getTotalGoals(fixture.Score, "Participant1");
  const away = getTotalGoals(fixture.Score, "Participant2");
  return gameState === 2 || gameState === 3 || isTerminalMatchStatus(state) || ["game_finalised", "game_finalized", "finished", "completed", "final"].includes(action) || (home !== null && away !== null && Boolean(fixture.EndTime ?? fixture.FinishedAt));
}

function normalizeTxlineTime(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value as any);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeFinishedAt(fixture: any, fallbackToNow = false) {
  const value = fixture.EndTime ?? fixture.FinishedAt ?? fixture.FinishTime ?? fixture.UpdatedAt ?? null;
  const normalized = normalizeTxlineTime(value);
  if (normalized) return normalized;
  return fallbackToNow ? new Date().toISOString() : null;
}


function flattenTxlineUpdates(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object") return [];
  for (const key of ["Updates", "updates", "Scores", "scores", "Data", "data", "Items", "items", "Events", "events"]) {
    if (Array.isArray(raw[key])) return raw[key];
  }
  return [raw];
}

function extractVerifiedFinalScoreFromHistoricalUpdates(fixtureId: string, raw: any) {
  const updates = flattenTxlineUpdates(raw).filter((update) => String(update?.FixtureId ?? update?.fixtureId ?? fixtureId) === fixtureId);
  const completedUpdates = updates
    .filter((update) => update?.Confirmed !== false && isCompletedFixture(update))
    .filter((update) => getTotalGoals(update?.Score, "Participant1") !== null && getTotalGoals(update?.Score, "Participant2") !== null);

  const finalUpdate = completedUpdates.at(-1);
  if (!finalUpdate) return null;

  const finishedAt = normalizeFinishedAt(finalUpdate, false);
  if (!finishedAt) {
    console.log(JSON.stringify({ level: "warn", component: "worker", event: "historical_score_missing_completion_timestamp", fixture_id: fixtureId, endpoint: TXLINE_HISTORICAL_SCORE_UPDATES_ENDPOINT }));
    return null;
  }

  return {
    raw: finalUpdate,
    score: {
      home_h1: finalUpdate.Score?.Participant1?.H1?.Goals ?? 0,
      away_h1: finalUpdate.Score?.Participant2?.H1?.Goals ?? 0,
      home_total: Number(getTotalGoals(finalUpdate.Score, "Participant1")),
      away_total: Number(getTotalGoals(finalUpdate.Score, "Participant2")),
    },
    finishedAt,
  };
}

function normalizeScoreEvent(raw: any) {
  const action = (raw.Action ?? raw.EventType ?? "unknown").toString().toLowerCase();
  return {
    fixture_id: String(raw.FixtureId),
    event_type: action,
    minute: raw.Minute ?? raw.MatchMinute ?? null,
    team: null,
  };
}

type NormalizedTick = {
  fixtureId: string;
  market: string;
  selection: string;
  price: number;
};

function normalizeOddsTicks(raw: any): NormalizedTick[] {
  const fixtureId = raw.FixtureId;
  const priceNames: string[] = raw.PriceNames ?? [];
  const prices: number[] = raw.Prices ?? [];

  if (!fixtureId || !priceNames.length || priceNames.length !== prices.length) {
    return [];
  }

  const marketKey = [raw.SuperOddsType, raw.MarketParameters, raw.MarketPeriod]
    .filter(Boolean)
    .join(":");

  return priceNames.map((selection, i) => ({
    fixtureId: String(fixtureId),
    market: marketKey,
    selection,
    price: prices[i] / PRICE_SCALE,
  }));
}

async function loadWorldCupFixtures() {
  // Replay is built from stored live odds captured while the worker was running.
  // It cannot reconstruct odds history for matches that were completed before SharpLine was deployed.
  console.log("[worker] loading World Cup fixtures...");
  const fixtures = await getFixturesSnapshot(WORLD_CUP_COMPETITION_ID);

  for (const f of fixtures) {
    const fixtureId = String(f.FixtureId);
    const completed = isCompletedFixture(f);
    const gameState = Number(f.GameState ?? f.gameState);
    const status = completed ? TERMINAL_MATCH_STATUS : gameState === 1 ? "live_or_upcoming" : "scheduled";
    const kickoffAt = normalizeTxlineTime(f.StartTime);
    const finishedAt = completed ? normalizeFinishedAt(f, true) : null;
    const homeTeam = f.Participant1 ?? "Participant 1";
    const awayTeam = f.Participant2 ?? "Participant 2";
    const homeScore = getTotalGoals(f.Score, "Participant1");
    const awayScore = getTotalGoals(f.Score, "Participant2");

    await upsertFixture({
      id: fixtureId,
      home_team: homeTeam,
      away_team: awayTeam,
      status,
      kickoff_at: kickoffAt,
    });
    await insertMatch({
      id: fixtureId,
      home_team: homeTeam,
      away_team: awayTeam,
      status,
      kickoff_at: kickoffAt,
      finished_at: finishedAt,
      home_score: homeScore,
      away_score: awayScore,
      is_demo: false,
    });

    matchStates.set(fixtureId, {
      fixtureId,
      match: `${homeTeam} vs ${awayTeam}`,
      homeScore: homeScore ?? 0,
      awayScore: awayScore ?? 0,
      isDemo: false,
    });

    if (completed) {
      await resolveSignalsForFixture(
        fixtureId,
        homeScore !== null && awayScore !== null
          ? { home_h1: 0, away_h1: 0, home_total: homeScore, away_total: awayScore }
          : undefined
      );
    }
  }

  counters.fixturesLoaded = fixtures.length;
  counters.completedFixturesLoaded = fixtures.filter(isCompletedFixture).length;
  counters.upcomingFixturesLoaded = fixtures.length - counters.completedFixturesLoaded;
  console.log(JSON.stringify({ level: "info", component: "worker", event: "fixtures_loaded", count: fixtures.length, upcoming: counters.upcomingFixturesLoaded, completed: counters.completedFixturesLoaded }));
}

async function handleOddsMessage(event: string, data: any) {
  if (event === "heartbeat") return;

  counters.eventsProcessed++;
  lastTxlineEventAt = new Date().toISOString();
  const ticks = normalizeOddsTicks(data);

  for (const tick of ticks) {
    counters.oddsUpdatesProcessed++;
    let match = matchStates.get(tick.fixtureId);
    if (!match) {
      const fixtureMatch = await getMatchById(tick.fixtureId);
      match = {
        fixtureId: tick.fixtureId,
        match: fixtureMatch?.home_team && fixtureMatch?.away_team ? `${fixtureMatch.home_team} vs ${fixtureMatch.away_team}` : tick.fixtureId,
        homeScore: Number(fixtureMatch?.home_score ?? 0),
        awayScore: Number(fixtureMatch?.away_score ?? 0),
        isDemo: false,
      };
      if (!fixtureMatch) {
        await insertMatch({
          id: tick.fixtureId,
          home_team: "Participant 1",
          away_team: "Participant 2",
          status: "live",
          kickoff_at: null,
          is_demo: false,
        });
      }
      matchStates.set(tick.fixtureId, match);
    }
    activeFixtureId = tick.fixtureId;
    await insertOddsTick({
      fixture_id: tick.fixtureId,
      market: tick.market,
      selection: tick.selection,
      price: tick.price,
    });
    await insertOddsSnapshot({
      fixture_id: tick.fixtureId,
      match: match.match,
      market: tick.market,
      selection: tick.selection,
      price: tick.price,
      home_score: match.homeScore,
      away_score: match.awayScore,
      is_demo: false,
    });

    console.log(JSON.stringify({ level: "info", component: "worker", event: "detector_calling", fixture_id: tick.fixtureId, market: tick.market, selection: tick.selection, price: tick.price, home_score: match.homeScore, away_score: match.awayScore }));
    const marketSignal = detectMarketSignal({
      fixtureId: tick.fixtureId,
      match: match.match,
      market: tick.market,
      selection: tick.selection,
      price: tick.price,
      ts: Date.now(),
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      isDemo: false,
    }, match);

    console.log(JSON.stringify({ level: "info", component: "worker", event: "detector_result", fixture_id: tick.fixtureId, market: tick.market, selection: tick.selection, signal_generated: Boolean(marketSignal), movement_pct: marketSignal?.movementPct ?? null, threshold_pct: SHARP_THRESHOLD_PCT }));

    if (marketSignal) {
      const historicalComparison = await getHistoricalComparison({
        market: marketSignal.market,
        selection: marketSignal.selection,
        action: marketSignal.action,
        reason_code: marketSignal.reasonCode,
      });
      const enrichedSignal = { ...marketSignal, historicalComparison };
      const signalPayload = {
        fixture_id: enrichedSignal.fixtureId,
        competition: enrichedSignal.competition,
        match: enrichedSignal.match,
        market: enrichedSignal.market,
        selection: enrichedSignal.selection,
        previous_odds: enrichedSignal.previousOdds,
        current_odds: enrichedSignal.currentOdds,
        movement_pct: enrichedSignal.movementPct,
        direction: enrichedSignal.direction,
        severity: enrichedSignal.severity,
        confidence: enrichedSignal.confidence,
        reason_code: enrichedSignal.reasonCode,
        action: enrichedSignal.action,
        explanation: fallbackExplanation(enrichedSignal),
        ai_provider: "fallback" as const,
        historical_similar_count: historicalComparison.similarSignals,
        historical_success_rate: historicalComparison.historicalSuccessRate,
        historical_average_roi: historicalComparison.averageRoi,
        current_match_state: enrichedSignal.currentMatchState,
        pending_resolution: enrichedSignal.pendingResolution,
        occurred_at: enrichedSignal.occurredAt,
        is_demo: false,
      };
      const signalId = await insertMarketSignal(signalPayload);
      if (signalId) {
        counters.signalsGenerated++;
        explainSignal(enrichedSignal).then(async (ai) => {
          const { updateMarketSignalExplanation } = await import("./db/repository.js");
          await updateMarketSignalExplanation(signalId, ai.explanation, ai.aiProvider);
        }).catch((err) => console.error("[ai] explanation enrichment failed:", err.message));
      }
    }

    const detection = checkForSharpMovement(
      tick.fixtureId,
      tick.market,
      tick.selection,
      tick.price
    );

    if (!detection) continue;

    console.log(
      `[detect] sharp movement ${detection.fixtureId} ${detection.market}/${detection.selection} ` +
        `${detection.priceBefore} -> ${detection.priceAfter} (${detection.pctChange.toFixed(1)}%)`
    );

    const { classification, confidence } = await classifyMovement(
      detection.fixtureId,
      detection.detectedAt
    );

    await insertSignal({
      fixture_id: detection.fixtureId,
      market: detection.market,
      selection: detection.selection,
      price_before: detection.priceBefore,
      price_after: detection.priceAfter,
      pct_change: detection.pctChange,
      classification,
      confidence,
    });
  }
}

async function resolveSignalsForFixture(fixtureId: string, finalScore?: { home_h1: number; away_h1: number; home_total: number; away_total: number }) {
  let score = finalScore;
  if (!score) {
    const match = await getMatchById(fixtureId);
    if (!match?.finished_at && !isTerminalMatchStatus(match?.status)) {
      console.log(`[resolver] fixture ${fixtureId} is not finished; skipping signal resolution`);
      return 0;
    }
    if (match?.home_score === null || match?.home_score === undefined || match?.away_score === null || match?.away_score === undefined) {
      console.log(`[resolver] fixture ${fixtureId} has no final score; skipping signal resolution`);
      return 0;
    }
    score = { home_h1: 0, away_h1: 0, home_total: Number(match.home_score), away_total: Number(match.away_score) };
  }

  const unresolvedMarketSignals = await getUnresolvedMarketSignalsForFixture(fixtureId);
  console.log(`[resolver] resolving ${unresolvedMarketSignals.length} unresolved market signal(s) for fixture ${fixtureId}`);

  for (const signal of unresolvedMarketSignals) {
    const outcome = resolveSignal({ market: signal.market, selection: signal.selection }, score);
    if (outcome === null) {
      console.log(`[resolver] skipped market signal (unsupported market): ${signal.market}/${signal.selection}`);
      await markMarketSignalUnsupported(signal, `Unsupported market: ${signal.market}/${signal.selection}`);
      continue;
    }
    const resolved = await resolveMarketSignal(signal, {
      outcome,
      finalScore: `${score.home_total}-${score.away_total}`,
      finalOdds: Number(signal.current_odds),
    });
    console.log(`[resolver] market signal ${signal.id} ${signal.market}/${signal.selection} -> ${outcome}`);

    if (resolved && (outcome === "won" || outcome === "lost")) {
      const signature = await anchorSignalMemo({
        id: signal.id,
        fixture_id: signal.fixture_id,
        market: signal.market,
        selection: signal.selection,
        price_before: Number(signal.previous_odds),
        price_after: Number(signal.current_odds),
        pct_change: Number(signal.movement_pct),
        classification: signal.severity ?? signal.action,
        confidence: Number(signal.confidence),
        outcome,
      });

      if (signature) {
        await saveMarketSignalAnchorTx(signal.id, signature);
      }
    }
  }

  return unresolvedMarketSignals.length;
}

async function handleGameFinalised(data: any) {
  const fixtureId = String(data.FixtureId);
  const score = {
    home_h1: data.Score?.Participant1?.H1?.Goals ?? 0,
    away_h1: data.Score?.Participant2?.H1?.Goals ?? 0,
    home_total: data.Score?.Participant1?.Total?.Goals ?? 0,
    away_total: data.Score?.Participant2?.Total?.Goals ?? 0,
  };

  console.log(
    `[resolver] game finalised ${fixtureId}: H1 ${score.home_h1}-${score.away_h1}, ` +
      `FT ${score.home_total}-${score.away_total}`
  );

  await saveFinalScore(fixtureId, score, normalizeFinishedAt(data, true) ?? undefined);

  await resolveSignalsForFixture(fixtureId, score);

  const pendingSignals = await getPendingSignals(fixtureId);
  console.log(`[resolver] resolving ${pendingSignals.length} legacy pending signal(s) for fixture ${fixtureId}`);

  for (const signal of pendingSignals) {
    const outcome = resolveSignal(
      { market: signal.market, selection: signal.selection },
      score
    );

    if (outcome === null) {
      console.log(`[resolver] skipped (unsupported market): ${signal.market}/${signal.selection}`);
      continue;
    }

    await updateSignalOutcome(signal.id, outcome);
    console.log(`[resolver] ${signal.market}/${signal.selection} -> ${outcome}`);

    // Write a SharpLine integrity memo for definitive won/lost outcomes.
    // Pushes are skipped because there is no clear win/loss to record.
    if (outcome === "won" || outcome === "lost") {
      const signature = await anchorSignalMemo({
        id: signal.id,
        fixture_id: signal.fixture_id,
        market: signal.market,
        selection: signal.selection,
        price_before: signal.price_before,
        price_after: signal.price_after,
        pct_change: signal.pct_change,
        classification: signal.classification,
        confidence: signal.confidence,
        outcome,
      });

      if (signature) {
        await saveAnchorTx(signal.id, signature);
      }
    }
  }
}

async function handleScoreMessage(event: string, data: any) {
  if (event === "heartbeat") return;

  console.log(JSON.stringify({ level: "info", component: "worker", event: "score_message_received", stream_event: event, fixture_id: data?.FixtureId ? String(data.FixtureId) : null, action: data?.Action ?? data?.EventType ?? null, confirmed: data?.Confirmed ?? null, has_score: Boolean(data?.Score), completed: isCompletedFixture(data) }));
  counters.eventsProcessed++;
  lastTxlineEventAt = new Date().toISOString();
  const fixtureIdForState = data.FixtureId ? String(data.FixtureId) : null;
  if (fixtureIdForState) {
    const current = matchStates.get(fixtureIdForState);
    if (current && data.Score) {
      const homeScore = data.Score?.Participant1?.Total?.Goals ?? current.homeScore;
      const awayScore = data.Score?.Participant2?.Total?.Goals ?? current.awayScore;
      if (homeScore !== current.homeScore || awayScore !== current.awayScore) current.lastScoreChangeAt = Date.now();
      current.homeScore = homeScore;
      current.awayScore = awayScore;
    }
  }

  if (fixtureIdForState) activeFixtureId = fixtureIdForState;
  const scoreEvent = normalizeScoreEvent(data);

  if (data.Confirmed === false) {
    console.log(JSON.stringify({ level: "info", component: "worker", event: "score_event_rejected", fixture_id: scoreEvent.fixture_id, event_type: scoreEvent.event_type, rejection_reason: "unconfirmed" }));
    return;
  }

  await insertScoreEvent({ ...scoreEvent, is_demo: false });

  if (data.Score && isCompletedFixture(data)) {
    await handleGameFinalised(data);
    return;
  }
}

async function reconcileStalePastKickoffFixtures() {
  const cutoff = new Date(Date.now() - STALE_FIXTURE_GRACE_MS).toISOString();
  const staleMatches = await getStalePastKickoffMatches(cutoff);
  if (!staleMatches.length) return { stale: 0, backfilled: 0 };

  console.log(JSON.stringify({ level: "info", component: "worker", event: "historical_finished_reconciliation_started", stale: staleMatches.length, endpoint: TXLINE_HISTORICAL_SCORE_UPDATES_ENDPOINT, dryRun: !process.argv.includes("--write") }));
  let backfilled = 0;

  for (const match of staleMatches) {
    const fixtureId = String(match.id);
    const updates = await getScoreUpdates(fixtureId);
    const final = extractVerifiedFinalScoreFromHistoricalUpdates(fixtureId, updates);
    if (!final) {
      console.log(JSON.stringify({ level: "info", component: "worker", event: "historical_finished_reconciliation_skipped", fixture_id: fixtureId, reason: "no_verified_completed_score", endpoint: TXLINE_HISTORICAL_SCORE_UPDATES_ENDPOINT }));
      continue;
    }

    console.log(JSON.stringify({ level: "info", component: "worker", event: "historical_finished_reconciliation_verified", fixture_id: fixtureId, endpoint: TXLINE_HISTORICAL_SCORE_UPDATES_ENDPOINT, status: TERMINAL_MATCH_STATUS, final_home_score: final.score.home_total, final_away_score: final.score.away_total, completion_timestamp: final.finishedAt, write: process.argv.includes("--write") }));
    if (!process.argv.includes("--write")) continue;

    await saveFinalScore(fixtureId, final.score, final.finishedAt);
    await resolveSignalsForFixture(fixtureId, final.score);
    backfilled++;
  }

  if (backfilled > 0) {
    console.log(`[resolver] backfilled ${backfilled}/${staleMatches.length} stale past-kickoff fixture(s)`);
  }
  return { stale: staleMatches.length, backfilled };
}

async function reconcileCompletedMatches(options: { reconcileStaleFixtures?: boolean } = {}) {
  if (options.reconcileStaleFixtures ?? true) await reconcileStalePastKickoffFixtures();
  const pending = await getCompletedMatchesWithPendingSignals();
  if (!pending.length) return;
  const fixtureIds = [...new Set(pending.map((signal: any) => String(signal.fixture_id)))];
  console.log(`[resolver] reconciliation found unresolved signal(s) on ${fixtureIds.length} completed match(es)`);
  for (const fixtureId of fixtureIds) await resolveSignalsForFixture(fixtureId);
}

async function saveHeartbeat() {
  const active = isAnyMatchActive();
  currentState = active ? "processing_live_match" : "waiting_for_kickoff";
  txlineStatus = active ? txlineStatus : (txlineStatus === "offline" ? "offline" : "waiting");
  await upsertAgentState({
    mode: "live",
    worker_status: workerStatus,
    txline_status: txlineStatus,
    current_state: currentState,
    fixtures_loaded: counters.fixturesLoaded,
    events_processed: counters.eventsProcessed,
    odds_updates_processed: counters.oddsUpdatesProcessed,
    signals_generated: counters.signalsGenerated,
    reconnect_count: counters.reconnectCount,
    last_heartbeat_at: new Date().toISOString(),
    last_txline_event_at: lastTxlineEventAt,
    active_fixture_id: activeFixtureId,
    notes: active
      ? "Active match. Processing live TxLINE odds and score feeds."
      : `No active match. Loaded ${counters.upcomingFixturesLoaded} upcoming and ${counters.completedFixturesLoaded} completed TxLINE fixtures. Replay is built from stored live odds captured while the worker was running.`,
  });
  console.log(JSON.stringify({ level: "info", component: "worker", event: "heartbeat_saved", txlineStatus, currentState, activeMatch: active, fixturesLoaded: counters.fixturesLoaded, oddsUpdatesProcessed: counters.oddsUpdatesProcessed, signalsGenerated: counters.signalsGenerated }));
}

async function runActiveWindow() {
  const controller = new AbortController();
  txlineStatus = "connected";
  activeFixtureId = null;

  const monitor = setInterval(async () => {
    await refreshFixtureWindows().catch((err) =>
      console.error("[scheduler] refresh error:", err.message)
    );
    if (!isAnyMatchActive()) {
      console.log("[worker] match window ended, disconnecting streams...");
      txlineStatus = "waiting";
      activeFixtureId = null;
      controller.abort();
    }
  }, MONITOR_INTERVAL_MS);

  try {
    console.log(JSON.stringify({ level: "info", component: "worker", event: "stream_subscription_starting", streams: ["odds", "scores"] }));
    await Promise.all([
      connectOddsStream((event, data) => {
        handleOddsMessage(event, data).catch((err) =>
          console.error("[handleOddsMessage] error:", err.message)
        );
      }, controller.signal),
      connectScoresStream((event, data) => {
        handleScoreMessage(event, data).catch((err) =>
          console.error("[handleScoreMessage] error:", err.message)
        );
      }, controller.signal),
    ]);
  } catch (err: any) {
    counters.reconnectCount++;
    txlineStatus = "reconnecting";
    controller.abort();
    console.error("[worker] stream error:", err?.message ?? err);
  } finally {
    clearInterval(monitor);
  }
}

async function main() {
  const selectedServiceLevel = getSelectedWorldCupServiceLevel();
  console.log(JSON.stringify({ level: "info", component: "txline", event: "service_level_selected", network: selectedServiceLevel.network, serviceLevelId: selectedServiceLevel.serviceLevelId, delay: selectedServiceLevel.delay }));

  try {
    await ensureTxlineSessionReady();
  } catch (err: any) {
    workerStatus = "error";
    txlineStatus = "offline";
    console.error("[worker] TxLINE startup error:", err.message);
    await upsertAgentState({ mode: "live", worker_status: "error", txline_status: "offline", notes: err.message });
    throw err;
  }
  await loadWorldCupFixtures();
  await refreshFixtureWindows();
  await saveHeartbeat();
  setInterval(() => {
    saveHeartbeat().catch((err) => console.error("[heartbeat] error:", err.message));
  }, HEARTBEAT_INTERVAL_MS);
  setInterval(() => {
    reconcileCompletedMatches().catch((err) => console.error("[resolver] reconciliation error:", err.message));
  }, RECONCILIATION_INTERVAL_MS);
  await reconcileCompletedMatches();

  console.log("[worker] scheduler started - autonomous mode");

  while (true) {
    if (isAnyMatchActive()) {
      console.log("[worker] match window active - connecting streams");
      await runActiveWindow();
      if (isAnyMatchActive()) await sleep(STREAM_RECONNECT_BACKOFF_MS);
    } else {
      const waitMs = Math.min(msUntilNextWindowChange(), REFRESH_INTERVAL_MS);
      const waitMin = Math.max(1, Math.round(waitMs / 60000));
      console.log(`[worker] no active match - sleeping ~${waitMin} min before re-check`);
      await sleep(waitMs);
      await refreshFixtureWindows();
    }
  }
}

if (process.argv.includes("--reconcile-once")) {
  (async () => {
    await ensureTxlineSessionReady();
    const write = process.argv.includes("--write");
    const result = await reconcileStalePastKickoffFixtures();
    if (write) await reconcileCompletedMatches({ reconcileStaleFixtures: false });
    console.log(JSON.stringify({ level: "info", component: "worker", event: "reconcile_once_complete", dryRun: !write, ...result }));
  })().catch((err) => {
    console.error("[worker] reconcile-once fatal error:", err?.response?.data || err.message || err);
    process.exit(1);
  });
} else {
  main().catch(async (err) => {
    workerStatus = "error";
    txlineStatus = "offline";
    console.error("[worker] fatal error:", err?.response?.data || err.message || err);
    await upsertAgentState({ mode: "live", worker_status: "error", txline_status: "offline", notes: err?.message ?? "fatal worker error" }).catch(() => undefined);
    process.exit(1);
  });
}

process.on("SIGINT", () => {
  console.log("\n[worker] shutting down gracefully...");
  workerStatus = "stopped";
  upsertAgentState({ mode: "live", worker_status: "stopped", txline_status: "offline", notes: "Worker stopped." }).finally(() => process.exit(0));
});
