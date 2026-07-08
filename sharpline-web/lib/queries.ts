import { supabaseServer } from "./supabase-server";

export type CompletedMatch = {
  id: string;
  home_team: string;
  away_team: string;
  status: string;
  kickoff_at: string | null;
  finished_at: string | null;
  final_score?: string | null;
  replayAvailable: boolean;
  signals: number;
  resolvedSignals: number;
  accuracy: number | null;
  bestSignal: string | null;
  largestOddsMovement: number | null;
  roi: number | null;
};

export type ResolvedSignal = {
  id: string;
  fixture_id: string;
  match: string;
  market: string;
  selection: string;
  action: string;
  confidence: number;
  movement_pct: number;
  previous_odds: number;
  current_odds: number;
  reason_code: string;
  explanation: string;
  occurred_at: string;
  outcome: string | null;
  roi_units: number | null;
  resolved_at: string | null;
  final_score: string | null;
};

export async function getAgentState() {
  try {
    const { data, error } = await supabaseServer.from("agent_state").select("*").eq("id", "live").eq("mode", "live").maybeSingle();
    if (error) {
      console.error("[queries] getAgentState error", error.message);
      return { backend_data_status: "error", backend_data_error: error.message };
    }
    return data ? { ...data, backend_data_status: "ok" } : { backend_data_status: "empty" };
  } catch (err) { console.error("[queries] getAgentState exception", err); return { backend_data_status: "error", backend_data_error: err instanceof Error ? err.message : "unknown error" }; }
}

export async function getLiveFixtures() {
  try {
    const { data, error } = await supabaseServer.from("matches").select("*").eq("is_demo", false).order("kickoff_at", { ascending: false });
    if (error) { console.error("[queries] query error", error.message); return []; }
    return data ?? [];
  } catch (err) { console.error("[queries] query exception", err); return []; }
}

export const getFixtures = getLiveFixtures;

export async function getCompletedMatches(limit = 6): Promise<CompletedMatch[]> {
  try {
    const { data: matches, error } = await supabaseServer
      .from("matches")
      .select("id, home_team, away_team, status, kickoff_at, finished_at, home_score, away_score")
      .eq("is_demo", false)
      .or("finished_at.not.is.null,status.in.(finished,completed,final)")
      .order("finished_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) { console.error("[queries] getCompletedMatches error", error.message); return []; }
    if (!matches?.length) return [];

    const fixtureIds = matches.map((match) => match.id);
    const [signalsRes, resolutionsRes, oddsRes] = await Promise.all([
      supabaseServer.from("market_signals").select("id, fixture_id, action, confidence, movement_pct, occurred_at, outcome, roi_units, final_score").eq("is_demo", false).in("fixture_id", fixtureIds),
      supabaseServer.from("signal_resolutions").select("outcome, roi_units, final_score, market_signals!inner(id, fixture_id, is_demo, action, confidence, movement_pct)").eq("market_signals.is_demo", false).in("market_signals.fixture_id", fixtureIds),
      supabaseServer.from("odds_snapshots").select("fixture_id, home_score, away_score, price, received_at").eq("is_demo", false).in("fixture_id", fixtureIds).order("received_at", { ascending: true }),
    ]);

    for (const [name, res] of Object.entries({ signalsRes, resolutionsRes, oddsRes })) if (res.error) console.error(`[queries] getCompletedMatches ${name} error`, res.error.message);
    const signals = signalsRes.data ?? [];
    const resolutions = resolutionsRes.data ?? [];
    const odds = oddsRes.data ?? [];

    return matches.map((match) => {
      const matchSignals = signals.filter((signal) => signal.fixture_id === match.id);
      const matchResolutions = resolutions.filter((row) => relation(row.market_signals)?.fixture_id === match.id);
      const decisive = matchResolutions.filter((row) => row.outcome === "won" || row.outcome === "lost");
      const wins = decisive.filter((row) => row.outcome === "won").length;
      const matchOdds = odds.filter((tick) => tick.fixture_id === match.id);
      const last = matchOdds.at(-1);
      const finalScore = matchResolutions.find((row) => row.final_score)?.final_score ?? (match.home_score !== null && match.away_score !== null ? `${match.home_score}-${match.away_score}` : last ? `${last.home_score ?? 0}-${last.away_score ?? 0}` : null);
      const best = matchSignals.slice().sort((a, b) => Number(b.confidence ?? 0) - Number(a.confidence ?? 0))[0];
      const largest = matchSignals.length ? Math.max(...matchSignals.map((signal) => Math.abs(Number(signal.movement_pct ?? 0)))) : null;
      const roiVals = matchResolutions.map((row) => Number(row.roi_units ?? 0));
      return {
        ...match,
        final_score: finalScore,
        replayAvailable: matchOdds.length > 0 || matchSignals.length > 0,
        signals: matchSignals.length,
        resolvedSignals: matchResolutions.length,
        accuracy: decisive.length ? Math.round((wins / decisive.length) * 100) : null,
        bestSignal: best ? `${best.action} · ${best.confidence}%` : null,
        largestOddsMovement: largest,
        roi: roiVals.length ? Number(roiVals.reduce((sum, value) => sum + value, 0).toFixed(2)) : null,
      };
    });
  } catch (err) { console.error("[queries] query exception", err); return []; }
}

export async function getLatestLiveSignal() {
  try {
    const { data, error } = await supabaseServer.from("market_signals").select("*").eq("is_demo", false).order("occurred_at", { ascending: false }).limit(1).maybeSingle();
    if (error) { console.error("[queries] getLatestLiveSignal error", error.message); return null; }
    return data ?? null;
  } catch (err) { console.error("[queries] query exception", err); return null; }
}

export const getLatestSignal = getLatestLiveSignal;

export async function getResolvedSignals(limit = 12): Promise<ResolvedSignal[]> {
  try {
    const { data, error } = await supabaseServer
      .from("signal_resolutions")
      .select("outcome, roi_units, final_score, resolved_at, market_signals!inner(id, fixture_id, match, market, selection, action, confidence, movement_pct, previous_odds, current_odds, reason_code, explanation, occurred_at, is_demo)")
      .eq("market_signals.is_demo", false)
      .order("resolved_at", { ascending: false })
      .limit(limit);
    if (error) { console.error("[queries] getResolvedSignals error", error.message); return []; }
    return (data ?? []).map((row) => {
      const signal = relation(row.market_signals);
      return { ...signal, outcome: row.outcome, roi_units: row.roi_units, resolved_at: row.resolved_at, final_score: row.final_score } as ResolvedSignal;
    });
  } catch (err) { console.error("[queries] query exception", err); return []; }
}

export async function getLatestResolvedSignal() {
  const signals = await getResolvedSignals(1);
  return signals[0] ?? null;
}

export async function getRecentLiveSignals(limit = 10) {
  try {
    const { data, error } = await supabaseServer.from("market_signals").select("*").eq("is_demo", false).order("occurred_at", { ascending: false }).limit(limit);
    if (error) { console.error("[queries] getRecentLiveSignals error", error.message); return []; }
    return data ?? [];
  } catch (err) { console.error("[queries] query exception", err); return []; }
}

export const getRecentSignals = getRecentLiveSignals;

export async function getOddsHistory(fixtureId: string, market: string, limit = 60) {
  try {
    const { data, error } = await supabaseServer.from("odds_snapshots").select("*").eq("fixture_id", fixtureId).eq("market", market).eq("is_demo", false).order("received_at", { ascending: true }).limit(limit);
    if (error) { console.error("[queries] getRecentLiveSignals error", error.message); return []; }
    return data ?? [];
  } catch (err) { console.error("[queries] query exception", err); return []; }
}

export async function getMatchReplay(fixtureId: string) {
  try {
    const [matchRes, oddsRes, signalsRes, resolutionsRes] = await Promise.all([
      supabaseServer.from("matches").select("id, home_team, away_team, status, kickoff_at, finished_at, home_score, away_score").eq("is_demo", false).eq("id", fixtureId).maybeSingle(),
      supabaseServer.from("odds_snapshots").select("*").eq("fixture_id", fixtureId).eq("is_demo", false).order("received_at", { ascending: true }).limit(120),
      supabaseServer.from("market_signals").select("*").eq("fixture_id", fixtureId).eq("is_demo", false).order("occurred_at", { ascending: true }),
      supabaseServer.from("signal_resolutions").select("*, market_signals!inner(id, fixture_id, is_demo)").eq("market_signals.is_demo", false).eq("market_signals.fixture_id", fixtureId).order("resolved_at", { ascending: true }),
    ]);
    if (matchRes.error) { console.error("[queries] getMatchReplay match error", matchRes.error.message); return null; }
    for (const [name, res] of Object.entries({ oddsRes, signalsRes, resolutionsRes })) if (res.error) console.error(`[queries] getMatchReplay ${name} error`, res.error.message);
    if (!matchRes.data) return null;
    return { match: matchRes.data, odds: oddsRes.data ?? [], signals: signalsRes.data ?? [], resolutions: resolutionsRes.data ?? [] };
  } catch (err) { console.error("[queries] query exception", err); return null; }
}

export async function getPastMatchPerformance() {
  const [completedMatches, resolvedSignals, stats] = await Promise.all([getCompletedMatches(8), getResolvedSignals(20), getLiveSignalStats()]);
  return { ...stats, completedMatchesAnalyzed: completedMatches.length, resolvedSignals: resolvedSignals.length, recentResolvedMatches: completedMatches };
}

export async function getLiveSignalStats() {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const [completed, total, todaySignals, highConf, oddsToday, signals, resolutions] = await Promise.all([
      supabaseServer.from("matches").select("*", { count: "exact", head: true }).eq("is_demo", false).or("finished_at.not.is.null,status.in.(finished,completed,final)"),
      supabaseServer.from("market_signals").select("*", { count: "exact", head: true }).eq("is_demo", false),
      supabaseServer.from("market_signals").select("*", { count: "exact", head: true }).eq("is_demo", false).gte("occurred_at", today.toISOString()),
      supabaseServer.from("market_signals").select("*", { count: "exact", head: true }).eq("is_demo", false).gte("confidence", 85),
      supabaseServer.from("odds_snapshots").select("*", { count: "exact", head: true }).eq("is_demo", false).gte("received_at", today.toISOString()),
      supabaseServer.from("market_signals").select("action, confidence, movement_pct, match, occurred_at, outcome, roi_units, resolved_at").eq("is_demo", false),
      supabaseServer.from("signal_resolutions").select("outcome, roi_units, resolved_at, market_signals!inner(is_demo, action, market, selection, confidence, occurred_at)").eq("market_signals.is_demo", false),
    ]);
    const resolved = resolutions.data ?? [];
    const decisive = resolved.filter((r) => r.outcome === "won" || r.outcome === "lost");
    const wins = decisive.filter((r) => r.outcome === "won").length;
    const losses = decisive.filter((r) => r.outcome === "lost").length;
    const accuracy = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null;
    const roiVals = resolved.map((r) => Number(r.roi_units ?? 0));
    const averageRoi = roiVals.length ? Number(roiVals.reduce((a, b) => a + b, 0).toFixed(2)) : null;
    const allSignals = signals.data ?? [];
    const avgConfidence = allSignals.length ? Math.round(allSignals.reduce((sum, s) => sum + Number(s.confidence), 0) / allSignals.length) : null;
    const signalAction = (row: { market_signals: { action: string } | Array<{ action: string }> }) => relation(row.market_signals)?.action;
    const byAction = ["FOLLOW", "WATCH", "ALERT", "FADE"].map((action) => {
      const rows = resolved.filter((r) => signalAction(r) === action);
      const dec = rows.filter((r) => r.outcome === "won" || r.outcome === "lost");
      const actionWins = dec.filter((r) => r.outcome === "won").length;
      return { action, signals: allSignals.filter((s) => s.action === action).length, resolved: rows.length, accuracy: dec.length ? Math.round((actionWins / dec.length) * 100) : null, averageRoi: rows.length ? Number(rows.reduce((sum, r) => sum + Number(r.roi_units ?? 0), 0).toFixed(2)) : null };
    });
    const ranked = byAction.filter((x) => x.accuracy !== null).sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0));
    return { completedMatches: completed.count ?? null, totalSignals: total.count ?? null, signalsToday: todaySignals.count ?? null, highConfidenceAlerts: highConf.count ?? null, totalOddsUpdatesToday: oddsToday.count ?? null, accuracy, correctSignals: wins, incorrectSignals: losses, highConfidenceAccuracy: accuracy, averageRoi, avgConfidence, strategyPerformance: byAction, bestStrategy: ranked[0]?.action ?? null, worstStrategy: ranked.at(-1)?.action ?? null };
  } catch (err) { console.error("[queries] getLiveSignalStats exception", err); return { completedMatches: null, totalSignals: null, signalsToday: null, highConfidenceAlerts: null, totalOddsUpdatesToday: null, accuracy: null, correctSignals: null, incorrectSignals: null, highConfidenceAccuracy: null, averageRoi: null, avgConfidence: null, strategyPerformance: [], bestStrategy: null, worstStrategy: null }; }
}

export const getStats = getLiveSignalStats;
export const getAnalytics = getLiveSignalStats;

export async function getOddsHistoryForLatestSignal(signal: { fixture_id: string; market: string }, limit = 60) {
  return getOddsHistory(signal.fixture_id, signal.market, limit);
}

function relation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}
