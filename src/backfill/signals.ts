import "dotenv/config";
import { detectMarketSignal, resetSignalEngine } from "../engine/signal-engine.js";
import { fallbackExplanation } from "../ai/explain.js";
import { resolveSignal } from "../engine/resolver.js";
import type { MatchState } from "../types.js";
import { supabase } from "../db/supabase.js";
import {
  getHistoricalComparison,
  insertMarketSignal,
  isTerminalMatchStatus,
  marketSignalIdempotencyKey,
  markMarketSignalUnsupported,
  resolveMarketSignal,
} from "../db/repository.js";

type OddsSnapshot = {
  fixture_id: string;
  match: string | null;
  market: string;
  selection: string;
  price: number;
  home_score: number | null;
  away_score: number | null;
  received_at: string;
  is_demo: boolean | null;
};

type BackfillStats = {
  snapshotsScanned: number;
  groupsProcessed: number;
  signalsDetected: number;
  duplicatesSkipped: number;
  insertFailures: number;
  signalsInserted: number;
  signalsResolved: number;
  resolutionFailures: number;
  unsupportedResolutions: number;
};

const PAGE_SIZE = Number(process.env.SIGNAL_BACKFILL_PAGE_SIZE ?? 1000);

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  const write = args.has("--write");
  return {
    dryRun: !write || args.has("--dry-run"),
    resolve: !args.has("--skip-resolve"),
  };
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function snapshotToMatchState(snapshot: OddsSnapshot): MatchState {
  return {
    fixtureId: String(snapshot.fixture_id),
    match: snapshot.match || String(snapshot.fixture_id),
    homeScore: toNumber(snapshot.home_score),
    awayScore: toNumber(snapshot.away_score),
    isDemo: false,
  };
}

async function hasExistingMarketSignal(idempotencyKey: string) {
  const { data, error } = await supabase
    .from("market_signals")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.id);
}

async function fetchSnapshotPage(from: number, to: number) {
  const { data, error } = await supabase
    .from("odds_snapshots")
    .select("fixture_id, match, market, selection, price, home_score, away_score, received_at, is_demo")
    .eq("is_demo", false)
    .order("fixture_id", { ascending: true })
    .order("market", { ascending: true })
    .order("selection", { ascending: true })
    .order("received_at", { ascending: true })
    .range(from, to);

  if (error) throw error;
  return (data ?? []) as OddsSnapshot[];
}

async function backfillSignals(dryRun: boolean): Promise<BackfillStats> {
  resetSignalEngine();
  const stats: BackfillStats = {
    snapshotsScanned: 0,
    groupsProcessed: 0,
    signalsDetected: 0,
    duplicatesSkipped: 0,
    insertFailures: 0,
    signalsInserted: 0,
    signalsResolved: 0,
    resolutionFailures: 0,
    unsupportedResolutions: 0,
  };
  const groups = new Set<string>();

  for (let from = 0; ; from += PAGE_SIZE) {
    const page = await fetchSnapshotPage(from, from + PAGE_SIZE - 1);
    if (!page.length) break;

    for (const snapshot of page) {
      stats.snapshotsScanned++;
      groups.add(`${snapshot.fixture_id}:${snapshot.market}:${snapshot.selection}`);
      const ts = new Date(snapshot.received_at).getTime();
      if (!Number.isFinite(ts)) continue;

      const match = snapshotToMatchState(snapshot);
      const signal = detectMarketSignal({
        fixtureId: String(snapshot.fixture_id),
        match: match.match,
        market: snapshot.market,
        selection: snapshot.selection,
        price: Number(snapshot.price),
        ts,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        isDemo: false,
      }, match);

      if (!signal) continue;
      stats.signalsDetected++;

      const historicalComparison = dryRun
        ? { similarSignals: 0, historicalSuccessRate: null, averageRoi: null, examples: [] }
        : await getHistoricalComparison({
            market: signal.market,
            selection: signal.selection,
            action: signal.action,
            reason_code: signal.reasonCode,
          });
      const enrichedSignal = { ...signal, historicalComparison };
      const payload = {
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
      const idempotencyKey = marketSignalIdempotencyKey(payload);

      if (await hasExistingMarketSignal(idempotencyKey)) {
        stats.duplicatesSkipped++;
        continue;
      }
      if (dryRun) continue;

      try {
        const signalId = await insertMarketSignal({ ...payload, idempotency_key: idempotencyKey });
        if (signalId) stats.signalsInserted++;
        else stats.duplicatesSkipped++;
      } catch (error) {
        stats.insertFailures++;
        console.error(JSON.stringify({
          level: "error",
          component: "signal_backfill",
          event: "market_signal_insert_aborted",
          insertFailures: stats.insertFailures,
          signalsInserted: stats.signalsInserted,
          signalsDetected: stats.signalsDetected,
          error: error instanceof Error ? error.message : String(error),
        }));
        throw error;
      }
    }

    if (page.length < PAGE_SIZE) break;
  }

  stats.groupsProcessed = groups.size;
  return stats;
}

async function resolveBackfilledSignals(stats: BackfillStats, dryRun: boolean) {
  const { data, error } = await supabase
    .from("market_signals")
    .select("*, matches!inner(home_score, away_score, finished_at, status)")
    .eq("is_demo", false)
    .eq("pending_resolution", true)
    .not("matches.finished_at", "is", null)
    .not("matches.home_score", "is", null)
    .not("matches.away_score", "is", null);

  if (error) throw error;

  for (const signal of data ?? []) {
    const match = Array.isArray((signal as any).matches) ? (signal as any).matches[0] : (signal as any).matches;
    if (!match || !isTerminalMatchStatus(match.status)) continue;
    const score = { home_h1: 0, away_h1: 0, home_total: Number(match.home_score), away_total: Number(match.away_score) };
    const outcome = resolveSignal({ market: signal.market, selection: signal.selection }, score);

    if (dryRun) {
      if (outcome === null) stats.unsupportedResolutions++;
      else stats.signalsResolved++;
      continue;
    }

    if (outcome === null) {
      const ok = await markMarketSignalUnsupported(signal, `Unsupported market: ${signal.market}/${signal.selection}`);
      if (ok) stats.unsupportedResolutions++;
      else stats.resolutionFailures++;
      continue;
    }

    const ok = await resolveMarketSignal(signal, {
      outcome,
      finalScore: `${score.home_total}-${score.away_total}`,
      finalOdds: Number(signal.current_odds),
    });
    if (ok) stats.signalsResolved++;
    else stats.resolutionFailures++;
  }
}

async function main() {
  const { dryRun, resolve } = parseArgs();
  console.log(JSON.stringify({ level: "info", component: "signal_backfill", event: "started", mode: dryRun ? "dry-run" : "write" }));
  const stats = await backfillSignals(dryRun);
  if (resolve) await resolveBackfilledSignals(stats, dryRun);
  console.log(JSON.stringify({ level: "info", component: "signal_backfill", event: "completed", mode: dryRun ? "dry-run" : "write", ...stats }, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ level: "error", component: "signal_backfill", event: "failed", error: err?.message ?? String(err) }));
  process.exit(1);
});
