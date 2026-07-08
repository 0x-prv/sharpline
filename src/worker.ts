import { connectOddsStream, connectScoresStream } from "./txline/stream.js";
import { getFixturesSnapshot } from "./txline/client.js";
import { checkForSharpMovement } from "./engine/detector.js";
import { classifyMovement } from "./engine/correlator.js";
import { detectMarketSignal } from "./engine/signal-engine.js";
import { explainSignal } from "./ai/explain.js";
import type { MatchState } from "./types.js";
import { resolveSignal } from "./engine/resolver.js";
import { anchorSignalOnChain } from "./chain/memo.js";
import { saveAnchorTx } from "./db/repository.js";
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
  getPendingMarketSignals,
  resolveMarketSignal,
} from "./db/repository.js";
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

const counters = {
  fixturesLoaded: 0,
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
  console.log("[worker] loading World Cup fixtures...");
  const fixtures = await getFixturesSnapshot(WORLD_CUP_COMPETITION_ID);

  for (const f of fixtures) {
    const fixtureId = String(f.FixtureId);
    const status = f.GameState === 1 ? "live_or_upcoming" : "scheduled";
    const kickoffAt = f.StartTime ? new Date(f.StartTime).toISOString() : null;
    const homeTeam = f.Participant1 ?? "Participant 1";
    const awayTeam = f.Participant2 ?? "Participant 2";

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
      is_demo: false,
    });

    matchStates.set(fixtureId, {
      fixtureId,
      match: `${homeTeam} vs ${awayTeam}`,
      homeScore: 0,
      awayScore: 0,
      isDemo: false,
    });
  }

  counters.fixturesLoaded = fixtures.length;
  console.log(JSON.stringify({ level: "info", component: "worker", event: "fixtures_loaded", count: fixtures.length }));
}

async function handleOddsMessage(event: string, data: any) {
  if (event === "heartbeat") return;

  counters.eventsProcessed++;
  lastTxlineEventAt = new Date().toISOString();
  const ticks = normalizeOddsTicks(data);

  for (const tick of ticks) {
    counters.oddsUpdatesProcessed++;
    const match = matchStates.get(tick.fixtureId) ?? {
      fixtureId: tick.fixtureId,
      match: tick.fixtureId,
      homeScore: 0,
      awayScore: 0,
      isDemo: false,
    };
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

    if (marketSignal) {
      const historicalComparison = await getHistoricalComparison({
        market: marketSignal.market,
        selection: marketSignal.selection,
        action: marketSignal.action,
        reason_code: marketSignal.reasonCode,
      });
      const enrichedSignal = { ...marketSignal, historicalComparison };
      const ai = await explainSignal(enrichedSignal);
      await insertMarketSignal({
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
        explanation: ai.explanation,
        ai_provider: ai.aiProvider,
        historical_similar_count: historicalComparison.similarSignals,
        historical_success_rate: historicalComparison.historicalSuccessRate,
        historical_average_roi: historicalComparison.averageRoi,
        current_match_state: enrichedSignal.currentMatchState,
        pending_resolution: enrichedSignal.pendingResolution,
        is_demo: false,
      });
      counters.signalsGenerated++;
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

  await saveFinalScore(fixtureId, score);

  const pendingMarketSignals = await getPendingMarketSignals(fixtureId);
  console.log(`[resolver] resolving ${pendingMarketSignals.length} pending market signal(s) for fixture ${fixtureId}`);

  for (const signal of pendingMarketSignals) {
    const outcome = resolveSignal({ market: signal.market, selection: signal.selection }, score);
    if (outcome === null) {
      console.log(`[resolver] skipped market signal (unsupported market): ${signal.market}/${signal.selection}`);
      continue;
    }
    await resolveMarketSignal(signal, {
      outcome,
      finalScore: `${score.home_total}-${score.away_total}`,
      finalOdds: Number(signal.current_odds),
    });
    console.log(`[resolver] market signal ${signal.id} ${signal.market}/${signal.selection} -> ${outcome}`);
  }

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

    // Anchor on-chain for definitive won/lost outcomes (pushes are skipped —
    // no clear win/loss to attest to)
    if (outcome === "won" || outcome === "lost") {
      const signature = await anchorSignalOnChain({
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

  if (data.Action === "game_finalised" && data.Score) {
    await handleGameFinalised(data);
    return;
  }

  // Skip provisional/unconfirmed events (e.g. goal fires once as
  // Confirmed:false, then again as Confirmed:true) to avoid duplicates
  if (data.Confirmed === false) return;

  const scoreEvent = normalizeScoreEvent(data);
  await insertScoreEvent(scoreEvent);
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
    notes: active ? "Active match. Processing live TxLINE odds and score feeds." : "No active match. Monitoring fixture windows.",
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
    console.error("[worker] stream error:", err?.message ?? err);
  } finally {
    clearInterval(monitor);
  }
}

async function main() {
  await loadWorldCupFixtures();
  await refreshFixtureWindows();
  await saveHeartbeat();
  setInterval(() => {
    saveHeartbeat().catch((err) => console.error("[heartbeat] error:", err.message));
  }, HEARTBEAT_INTERVAL_MS);

  console.log("[worker] scheduler started — autonomous mode");

  while (true) {
    if (isAnyMatchActive()) {
      console.log("[worker] match window active — connecting streams");
      await runActiveWindow();
    } else {
      const waitMs = Math.min(msUntilNextWindowChange(), REFRESH_INTERVAL_MS);
      const waitMin = Math.max(1, Math.round(waitMs / 60000));
      console.log(`[worker] no active match — sleeping ~${waitMin} min before re-check`);
      await sleep(waitMs);
      await refreshFixtureWindows();
    }
  }
}

main().catch(async (err) => {
  workerStatus = "error";
  txlineStatus = "offline";
  console.error("[worker] fatal error:", err?.response?.data || err.message || err);
  await upsertAgentState({ mode: "live", worker_status: "error", txline_status: "offline", notes: err?.message ?? "fatal worker error" }).catch(() => undefined);
  process.exit(1);
});

process.on("SIGINT", () => {
  console.log("\n[worker] shutting down gracefully...");
  workerStatus = "stopped";
  upsertAgentState({ mode: "live", worker_status: "stopped", txline_status: "offline", notes: "Worker stopped." }).finally(() => process.exit(0));
});