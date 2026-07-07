import { supabase } from "./supabase.js";

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
  const { error } = await supabase.from("odds_ticks").insert(tick);
  if (error) console.error("[db] insertOddsTick error:", error.message);
}

export async function insertScoreEvent(event: {
  fixture_id: string;
  event_type: string;
  minute?: number | null;
  team?: string | null;
}) {
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
  }
) {
  const { error } = await supabase
    .from("fixtures")
    .update({
      home_score_h1: score.home_h1,
      away_score_h1: score.away_h1,
      home_score_total: score.home_total,
      away_score_total: score.away_total,
      status: "finished",
      finished_at: new Date().toISOString(),
    })
    .eq("id", fixtureId);
  if (error) console.error("[db] saveFinalScore error:", error.message);
}

export async function getPendingSignals(fixtureId: string) {
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
  const { error } = await supabase
    .from("signals")
    .update({ outcome, resolved_at: new Date().toISOString() })
    .eq("id", signalId);
  if (error) console.error("[db] updateSignalOutcome error:", error.message);
}

export async function saveAnchorTx(signalId: string, signature: string) {
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
export async function insertMatch(match: {
  id: string;
  home_team: string;
  away_team: string;
  status?: string;
  kickoff_at?: string | null;
  is_demo?: boolean;
}) {
  const { error } = await supabase.from("matches").upsert({
    id: match.id,
    home_team: match.home_team,
    away_team: match.away_team,
    status: match.status ?? "scheduled",
    kickoff_at: match.kickoff_at ?? null,
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
}

export async function insertMarketSignal(signal: {
  fixture_id: string;
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
  ai_provider: string;
  is_demo?: boolean;
}) {
  const { error } = await supabase.from("market_signals").insert(signal);
  if (error) console.error("[db] insertMarketSignal error:", error.message);
  else console.log(JSON.stringify({ level: "info", component: "signal", ...signal }));
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
