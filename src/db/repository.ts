import { createHash } from "crypto";
import { supabase } from "./supabase.js";

export const LEGACY_WRITES_ENABLED = process.env.LEGACY_WRITES_ENABLED === "true";
export const TERMINAL_MATCH_STATUS = "finished";
export const TERMINAL_MATCH_STATUSES = [TERMINAL_MATCH_STATUS, "completed", "final"];

export function isTerminalMatchStatus(status?: string | null) {
  return TERMINAL_MATCH_STATUSES.includes(String(status ?? "").toLowerCase());
}

function idempotencyKey(parts: Array<string | number | null | undefined>) {
  return createHash("sha256").update(parts.map((part) => String(part ?? "")).join("|")).digest("hex");
}
function serializeDatabaseError(error: unknown) {
  if (!error || typeof error !== "object") return { message: String(error) };
  const record = error as Record<string, unknown>;
  return {
    code: record.code ?? null,
    message: record.message ?? String(error),
    detail: record.detail ?? null,
    hint: record.hint ?? null,
    constraint: record.constraint ?? null,
    table: record.table ?? null,
    schema: record.schema ?? null,
    name: record.name ?? null,
    stack: record.stack ?? null,
  };
}

export function marketSignalIdempotencyKey(signal: { fixture_id: string; market: string; selection: string; reason_code: string; action: string; occurred_at?: string | null }) {
  const occurred = signal.occurred_at ? new Date(signal.occurred_at) : new Date();
  occurred.setUTCSeconds(0, 0);
  return idempotencyKey([signal.fixture_id, signal.market, signal.selection, signal.reason_code, signal.action, occurred.toISOString()]);
}


export type AgentStateUpdate = {
  mode?: "live" | "demo";
  txline_status?: "connected" | "reconnecting" | "offline" | "waiting";
  worker_status?: "running" | "stopped" | "error";
  current_state?: "monitoring" | "waiting_for_kickoff" | "processing_live_match";
  fixtures_loaded?: number;
  events_processed?: number;
  odds_updates_processed?: number;
  signals_generated?: number;
  reconnect_count?: number;
  last_heartbeat_at?: string | null;
  last_txline_event_at?: string | null;
  active_fixture_id?: string | null;
  notes?: string | null;
};

export async function upsertAgentState(update: AgentStateUpdate) {
  const payload = {
    id: "live",
    mode: update.mode ?? "live",
    updated_at: new Date().toISOString(),
    ...update,
  };
  const { error } = await supabase.from("agent_state").upsert(payload, { onConflict: "id" });
  if (error) console.error("[db] upsertAgentState error:", error.message);
}

export async function upsertFixture(fixture: {
  id: string;
  home_team: string;
  away_team: string;
  status?: string;
  kickoff_at?: string | null;
}) {
  if (!LEGACY_WRITES_ENABLED) return;
  const { error } = await supabase.from("fixtures").upsert({
    id: fixture.id,
    home_team: fixture.home_team,
    away_team: fixture.away_team,
    status: fixture.status ?? "scheduled",
    kickoff_at: fixture.kickoff_at ?? null,
  });
  if (error) console.error("[db] upsertFixture error:", error.message);
}

export async function insertOddsTick(tick: {
  fixture_id: string;
  market: string;
  selection: string;
  price: number;
}) {
  if (!LEGACY_WRITES_ENABLED) return;
  const { error } = await supabase.from("odds_ticks").insert(tick);
  if (error) console.error("[db] insertOddsTick error:", error.message);
}

export async function insertScoreEvent(event: {
  fixture_id: string;
  event_type: string;
  minute?: number | null;
  team?: string | null;
  is_demo?: boolean;
}) {
  const matchEvent = {
    fixture_id: event.fixture_id,
    event_type: event.event_type,
    minute: event.minute ?? null,
    team: event.team ?? null,
    is_demo: event.is_demo ?? false,
  };
  console.log(JSON.stringify({ level: "info", component: "db", event: "match_event_insert_attempted", ...matchEvent }));
  const { error: matchEventError } = await supabase.from("match_events").insert(matchEvent);
  if (matchEventError) console.error(JSON.stringify({ level: "error", component: "db", event: "match_event_insert_failed", fixture_id: matchEvent.fixture_id, event_type: matchEvent.event_type, error: matchEventError.message }));
  else console.log(JSON.stringify({ level: "info", component: "db", event: "match_event_insert_succeeded", fixture_id: matchEvent.fixture_id, event_type: matchEvent.event_type }));

  if (!LEGACY_WRITES_ENABLED) return;
  const { error } = await supabase.from("score_events").insert(event);
  if (error) console.error("[db] insertScoreEvent error:", error.message);
}

export async function insertSignal(signal: {
  fixture_id: string;
  market: string;
  selection: string;
  price_before: number;
  price_after: number;
  pct_change: number;
  classification: string;
  confidence: number;
}) {
  if (!LEGACY_WRITES_ENABLED) return;
  const { error } = await supabase.from("signals").insert(signal);
  if (error) console.error("[db] insertSignal error:", error.message);
  else
    console.log(
      `[signal] ${signal.fixture_id} ${signal.market}/${signal.selection} ` +
        `${signal.price_before} -> ${signal.price_after} (${signal.pct_change.toFixed(1)}%) ` +
        `[${signal.classification}] conf=${signal.confidence.toFixed(0)}%`
    );
}

export async function getRecentScoreEvents(fixtureId: string, sinceMs: number) {
  if (!LEGACY_WRITES_ENABLED) return [];
  const { data, error } = await supabase
    .from("score_events")
    .select("*")
    .eq("fixture_id", fixtureId)
    .gte("received_at", new Date(sinceMs).toISOString());
  if (error) {
    console.error("[db] getRecentScoreEvents error:", error.message);
    return [];
  }
  return data ?? [];
}

export async function saveFinalScore(
  fixtureId: string,
  score: {
    home_h1: number;
    away_h1: number;
    home_total: number;
    away_total: number;
  },
  finishedAt = new Date().toISOString()
) {
  const fixturePayload = {
    home_score_h1: score.home_h1,
    away_score_h1: score.away_h1,
    home_score_total: score.home_total,
    away_score_total: score.away_total,
    status: TERMINAL_MATCH_STATUS,
    finished_at: finishedAt,
  };
  if (LEGACY_WRITES_ENABLED) {
    const { error } = await supabase.from("fixtures").update(fixturePayload).eq("id", fixtureId);
    if (error) console.error("[db] saveFinalScore fixtures error:", error.message);
  }

  const { error: matchError } = await supabase
    .from("matches")
    .update({
      status: TERMINAL_MATCH_STATUS,
      home_score: score.home_total,
      away_score: score.away_total,
      finished_at: finishedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", fixtureId)
    .eq("is_demo", false);
  if (matchError) console.error("[db] saveFinalScore matches error:", matchError.message);
}

export async function getStalePastKickoffMatches(cutoffIso: string, limit = 100) {
  const { data, error } = await supabase
    .from("matches")
    .select("id, home_team, away_team, status, kickoff_at, finished_at, home_score, away_score")
    .eq("is_demo", false)
    .lt("kickoff_at", cutoffIso)
    .or("status.is.null,status.not.in.(finished,completed,final)")
    .order("kickoff_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[db] getStalePastKickoffMatches error:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getPendingSignals(fixtureId: string) {
  if (!LEGACY_WRITES_ENABLED) return [];
  const { data, error } = await supabase
    .from("signals")
    .select("*")
    .eq("fixture_id", fixtureId)
    .eq("outcome", "pending");
  if (error) {
    console.error("[db] getPendingSignals error:", error.message);
    return [];
  }
  return data ?? [];
}

export async function updateSignalOutcome(
  signalId: string,
  outcome: "won" | "lost" | "push"
) {
  if (!LEGACY_WRITES_ENABLED) return;
  const { error } = await supabase
    .from("signals")
    .update({ outcome, resolved_at: new Date().toISOString() })
    .eq("id", signalId);
  if (error) console.error("[db] updateSignalOutcome error:", error.message);
}

export async function saveAnchorTx(signalId: string, signature: string) {
  if (!LEGACY_WRITES_ENABLED) return;
  const { error } = await supabase
    .from("signals")
    .update({
      anchor_tx_signature: signature,
      anchored_at: new Date().toISOString(),
    })
    .eq("id", signalId);
  if (error) console.error("[db] saveAnchorTx error:", error.message);
  else console.log(`[db] signal ${signalId} anchored: ${signature}`);
}

export async function saveMarketSignalAnchorTx(signalId: string, signature: string) {
  const { error } = await supabase
    .from("signal_resolutions")
    .update({
      anchor_tx_signature: signature,
      anchored_at: new Date().toISOString(),
    })
    .eq("signal_id", signalId);
  if (error) console.error("[db] saveMarketSignalAnchorTx error:", error.message);
  else console.log(`[db] market signal ${signalId} anchored: ${signature}`);
}

export async function insertMatch(match: {
  id: string;
  home_team: string;
  away_team: string;
  status?: string;
  kickoff_at?: string | null;
  finished_at?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  is_demo?: boolean;
}) {
  const incomingStatus = match.status ?? "scheduled";
  const incomingIsTerminal = isTerminalMatchStatus(incomingStatus) || Boolean(match.finished_at);
  const { data: existing, error: existingError } = await supabase
    .from("matches")
    .select("status, finished_at, home_score, away_score")
    .eq("id", match.id)
    .eq("is_demo", match.is_demo ?? false)
    .maybeSingle();
  if (existingError) console.error("[db] insertMatch existing lookup error:", existingError.message);

  const existingIsTerminal = isTerminalMatchStatus(existing?.status) || Boolean(existing?.finished_at);
  const preserveTerminal = existingIsTerminal && !incomingIsTerminal;

  const { error } = await supabase.from("matches").upsert({
    id: match.id,
    home_team: match.home_team,
    away_team: match.away_team,
    status: preserveTerminal ? (existing?.status ?? TERMINAL_MATCH_STATUS) : incomingIsTerminal ? TERMINAL_MATCH_STATUS : incomingStatus,
    kickoff_at: match.kickoff_at ?? null,
    finished_at: preserveTerminal ? existing?.finished_at ?? null : match.finished_at ?? null,
    home_score: preserveTerminal ? existing?.home_score ?? match.home_score ?? null : match.home_score ?? null,
    away_score: preserveTerminal ? existing?.away_score ?? match.away_score ?? null : match.away_score ?? null,
    is_demo: match.is_demo ?? false,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error("[db] insertMatch error:", error.message);
}

export async function insertOddsSnapshot(snapshot: {
  fixture_id: string;
  match: string;
  market: string;
  selection: string;
  price: number;
  home_score?: number;
  away_score?: number;
  is_demo?: boolean;
}) {
  const { error } = await supabase.from("odds_snapshots").insert(snapshot);
  if (error) console.error("[db] insertOddsSnapshot error:", error.message);
  else console.log(JSON.stringify({ level: "info", component: "db", event: "odds_snapshot_received", fixture_id: snapshot.fixture_id, market: snapshot.market, selection: snapshot.selection, price: snapshot.price, home_score: snapshot.home_score, away_score: snapshot.away_score, is_demo: snapshot.is_demo ?? false }));
}

export async function insertMarketSignal(signal: {
  fixture_id: string;
  competition: string;
  match: string;
  market: string;
  selection: string;
  previous_odds: number;
  current_odds: number;
  movement_pct: number;
  direction: string;
  severity: string;
  confidence: number;
  reason_code: string;
  action: string;
  explanation: string;
  ai_provider: "groq" | "fallback";
  historical_similar_count?: number;
  historical_success_rate?: number | null;
  historical_average_roi?: number | null;
  current_match_state: string;
  pending_resolution: boolean;
  idempotency_key?: string;
  occurred_at?: string;
  is_demo?: boolean;
}) {
  const payload = { ...signal, idempotency_key: signal.idempotency_key ?? marketSignalIdempotencyKey(signal) };
  const insertPayloadForLog = {
    fixture_id: payload.fixture_id,
    market: payload.market,
    selection: payload.selection,
    current_odds: payload.current_odds,
    previous_odds: payload.previous_odds,
    reason_code: payload.reason_code,
    action: payload.action,
    occurred_at: payload.occurred_at,
    idempotency_key: payload.idempotency_key,
  };
  console.log(JSON.stringify({ level: "info", component: "db", event: "market_signal_insert_attempted", ...insertPayloadForLog, movement_pct: payload.movement_pct, threshold_context: "detector_passed" }));

  let result: { data: { id: string } | null; error: unknown };
  try {
    result = await supabase.from("market_signals").upsert(payload, { onConflict: "idempotency_key", ignoreDuplicates: true }).select("id").maybeSingle();
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      component: "db",
      event: "market_signal_insert_exception",
      postgres_error: serializeDatabaseError(error),
      postgrest_error: error,
      insert_payload: insertPayloadForLog,
    }));
    throw error;
  }

  if (result.error) {
    console.error(JSON.stringify({
      level: "error",
      component: "db",
      event: "market_signal_insert_failed",
      postgres_error: serializeDatabaseError(result.error),
      postgrest_error: result.error,
      insert_payload: insertPayloadForLog,
    }));
    throw result.error;
  }

  if (!result.data?.id) {
    console.log(JSON.stringify({ level: "warn", component: "db", event: "market_signal_insert_skipped_duplicate", ...insertPayloadForLog }));
    return null;
  }
  console.log(JSON.stringify({ level: "info", component: "db", event: "market_signal_insert_succeeded", signal_id: result.data.id, fixture_id: payload.fixture_id, market: payload.market, selection: payload.selection, movement_pct: payload.movement_pct, idempotency_key: payload.idempotency_key }));
  console.log(JSON.stringify({ level: "info", component: "signal", signal_id: result.data.id, ...payload }));
  return result.data.id as string;
}

export async function insertAgentRun(run: {
  mode: "live" | "demo";
  status: "started" | "finished" | "failed";
  message: string;
  metrics?: Record<string, unknown>;
}) {
  const { error } = await supabase.from("agent_runs").insert(run);
  if (error) console.error("[db] insertAgentRun error:", error.message);
}


export async function getHistoricalComparison(params: { market: string; selection: string; action: string; reason_code: string }) {
  const { data, error } = await supabase
    .from("signal_resolutions")
    .select("outcome, roi_units, market_signals!inner(match, market, selection, action, reason_code, occurred_at)")
    .eq("market_signals.market", params.market)
    .eq("market_signals.selection", params.selection)
    .eq("market_signals.action", params.action)
    .eq("market_signals.reason_code", params.reason_code)
    .order("resolved_at", { ascending: false })
    .limit(25);
  if (error) {
    console.error("[db] getHistoricalComparison error:", error.message);
    return { similarSignals: 0, historicalSuccessRate: null, averageRoi: null, examples: [] };
  }
  const rows = data ?? [];
  const decisive = rows.filter((row: any) => row.outcome === "won" || row.outcome === "lost");
  const wins = decisive.filter((row: any) => row.outcome === "won").length;
  const roiRows = rows.filter((row: any) => row.roi_units !== null && row.roi_units !== undefined);
  return {
    similarSignals: rows.length,
    historicalSuccessRate: decisive.length ? Math.round((wins / decisive.length) * 100) : null,
    averageRoi: roiRows.length ? Number((roiRows.reduce((sum: number, row: any) => sum + Number(row.roi_units), 0) / roiRows.length).toFixed(2)) : null,
    examples: rows.slice(0, 3).map((row: any) => ({
      match: row.market_signals.match,
      market: row.market_signals.market,
      selection: row.market_signals.selection,
      outcome: row.outcome,
      roi_units: Number(row.roi_units),
      occurred_at: row.market_signals.occurred_at,
    })),
  };
}

export async function getPendingMarketSignals(fixtureId: string) {
  const { data, error } = await supabase
    .from("market_signals")
    .select("*")
    .eq("fixture_id", fixtureId)
    .eq("is_demo", false)
    .eq("pending_resolution", true);
  if (error) {
    console.error("[db] getPendingMarketSignals error:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getUnresolvedMarketSignalsForFixture(fixtureId: string) {
  const { data: signals, error: signalError } = await supabase
    .from("market_signals")
    .select("*")
    .eq("fixture_id", fixtureId)
    .eq("is_demo", false);
  if (signalError) {
    console.error("[db] getUnresolvedMarketSignalsForFixture signals error:", signalError.message);
    return [];
  }

  const rows = signals ?? [];
  if (!rows.length) return [];

  const { data: resolutions, error: resolutionError } = await supabase
    .from("signal_resolutions")
    .select("signal_id")
    .in("signal_id", rows.map((signal: any) => signal.id));
  if (resolutionError) {
    console.error("[db] getUnresolvedMarketSignalsForFixture resolutions error:", resolutionError.message);
    return [];
  }

  const resolvedIds = new Set((resolutions ?? []).map((resolution: any) => resolution.signal_id));
  return rows.filter((signal: any) => !resolvedIds.has(signal.id));
}

export async function getMatchById(fixtureId: string) {
  const { data, error } = await supabase
    .from("matches")
    .select("id, home_team, away_team, home_score, away_score, finished_at, status")
    .eq("id", fixtureId)
    .eq("is_demo", false)
    .maybeSingle();
  if (error) {
    console.error("[db] getMatchById error:", error.message);
    return null;
  }
  return data;
}

export async function resolveMarketSignal(signal: { id: string; current_odds: number }, result: { outcome: "won" | "lost" | "push"; finalScore: string; finalOdds: number | null; unresolvedReason?: string | null }) {
  const roi = result.outcome === "push" ? 0 : result.outcome === "won" ? Number(signal.current_odds) - 1 : -1;
  const resolvedAt = new Date().toISOString();
  const { error: resolutionError } = await supabase.from("signal_resolutions").upsert({
    signal_id: signal.id,
    outcome: result.outcome,
    roi_units: roi,
    final_score: result.finalScore,
    final_odds: result.finalOdds,
    resolved_at: resolvedAt,
    unresolved_reason: result.unresolvedReason ?? null,
  }, { onConflict: "signal_id" });
  if (resolutionError) {
    console.error("[db] resolveMarketSignal upsert error:", resolutionError.message);
    return false;
  }
  const { error: signalError } = await supabase
    .from("market_signals")
    .update({ pending_resolution: false, resolved_at: resolvedAt, outcome: result.outcome, final_score: result.finalScore, final_odds: result.finalOdds, roi_units: roi })
    .eq("id", signal.id);
  if (signalError) {
    console.error("[db] resolveMarketSignal update error:", signalError.message);
    return false;
  }
  return true;
}

export async function markMarketSignalUnsupported(signal: { id: string }, unresolvedReason: string) {
  const resolvedAt = new Date().toISOString();
  const { error: resolutionError } = await supabase.from("signal_resolutions").upsert({
    signal_id: signal.id,
    outcome: "push",
    roi_units: 0,
    final_score: null,
    final_odds: null,
    resolved_at: resolvedAt,
    unresolved_reason: unresolvedReason,
  }, { onConflict: "signal_id" });
  if (resolutionError) {
    console.error("[db] markMarketSignalUnsupported upsert error:", resolutionError.message);
    return false;
  }
  const { error: signalError } = await supabase.from("market_signals").update({ pending_resolution: false, resolved_at: resolvedAt, outcome: "push", unresolved_reason: unresolvedReason }).eq("id", signal.id);
  if (signalError) {
    console.error("[db] markMarketSignalUnsupported update error:", signalError.message);
    return false;
  }
  return true;
}

export async function getCompletedMatchesWithPendingSignals(limit = 50) {
  const { data: signals, error: signalError } = await supabase
    .from("market_signals")
    .select("*, matches!inner(home_score, away_score, finished_at, status)")
    .eq("is_demo", false)
    .not("matches.finished_at", "is", null)
    .limit(limit);
  if (signalError) {
    console.error("[db] getCompletedMatchesWithPendingSignals signals error:", signalError.message);
    return [];
  }

  const rows = signals ?? [];
  if (!rows.length) return [];

  const { data: resolutions, error: resolutionError } = await supabase
    .from("signal_resolutions")
    .select("signal_id")
    .in("signal_id", rows.map((signal: any) => signal.id));
  if (resolutionError) {
    console.error("[db] getCompletedMatchesWithPendingSignals resolutions error:", resolutionError.message);
    return [];
  }

  const resolvedIds = new Set((resolutions ?? []).map((resolution: any) => resolution.signal_id));
  return rows.filter((signal: any) => !resolvedIds.has(signal.id));
}

export async function updateMarketSignalExplanation(signalId: string, explanation: string, aiProvider: string) {
  const { error } = await supabase
    .from("market_signals")
    .update({ explanation, ai_provider: aiProvider })
    .eq("id", signalId)
    .eq("pending_resolution", true);
  if (error) console.error("[db] updateMarketSignalExplanation error:", error.message);
}
