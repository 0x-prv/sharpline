import { connectOddsStream, connectScoresStream } from "./txline/stream.js";
import { getFixturesSnapshot } from "./txline/client.js";
import { checkForSharpMovement } from "./engine/detector.js";
import { classifyMovement } from "./engine/correlator.js";
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
    await upsertFixture({
      id: String(f.FixtureId),
      home_team: f.Participant1,
      away_team: f.Participant2,
      status: f.GameState === 1 ? "live_or_upcoming" : "scheduled",
      kickoff_at: f.StartTime ? new Date(f.StartTime).toISOString() : null,
    });
  }

  console.log(`[worker] loaded ${fixtures.length} World Cup fixtures`);
}

async function handleOddsMessage(event: string, data: any) {
  if (event === "heartbeat") return;

  const ticks = normalizeOddsTicks(data);

  for (const tick of ticks) {
    await insertOddsTick({
      fixture_id: tick.fixtureId,
      market: tick.market,
      selection: tick.selection,
      price: tick.price,
    });

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

  const pendingSignals = await getPendingSignals(fixtureId);
  console.log(`[resolver] resolving ${pendingSignals.length} pending signal(s) for fixture ${fixtureId}`);

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

async function runActiveWindow() {
  const controller = new AbortController();

  const monitor = setInterval(async () => {
    await refreshFixtureWindows().catch((err) =>
      console.error("[scheduler] refresh error:", err.message)
    );
    if (!isAnyMatchActive()) {
      console.log("[worker] match window ended, disconnecting streams...");
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
  } finally {
    clearInterval(monitor);
  }
}

async function main() {
  await loadWorldCupFixtures();
  await refreshFixtureWindows();

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

main().catch((err) => {
  console.error("[worker] fatal error:", err?.response?.data || err.message || err);
  process.exit(1);
});

process.on("SIGINT", () => {
  console.log("\n[worker] shutting down gracefully...");
  process.exit(0);
});