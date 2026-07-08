import { supabaseServer } from "./supabase-server";

export async function getAgentState() {
  try {
    const { data, error } = await supabaseServer.from("agent_state").select("*").eq("id", "live").eq("mode", "live").maybeSingle();
    return error ? null : data ?? null;
  } catch { return null; }
}

export async function getLiveFixtures() {
  try {
    const { data, error } = await supabaseServer.from("matches").select("*").eq("is_demo", false).order("kickoff_at", { ascending: false });
    return error ? [] : data ?? [];
  } catch { return []; }
}

export const getFixtures = getLiveFixtures;

export async function getLatestLiveSignal() {
  try {
    const { data, error } = await supabaseServer.from("market_signals").select("*").eq("is_demo", false).order("occurred_at", { ascending: false }).limit(1).maybeSingle();
    return error ? null : data ?? null;
  } catch { return null; }
}

export const getLatestSignal = getLatestLiveSignal;

export async function getRecentLiveSignals(limit = 10) {
  try {
    const { data, error } = await supabaseServer.from("market_signals").select("*").eq("is_demo", false).order("occurred_at", { ascending: false }).limit(limit);
    return error ? [] : data ?? [];
  } catch { return []; }
}

export const getRecentSignals = getRecentLiveSignals;

export async function getOddsHistory(fixtureId: string, market: string, limit = 60) {
  try {
    const { data, error } = await supabaseServer.from("odds_snapshots").select("*").eq("fixture_id", fixtureId).eq("market", market).eq("is_demo", false).order("received_at", { ascending: true }).limit(limit);
    return error ? [] : data ?? [];
  } catch { return []; }
}

export async function getLiveSignalStats() {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const [total, todaySignals, highConf, oddsToday, signals, resolutions] = await Promise.all([
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
    const averageRoi = roiVals.length ? Number((roiVals.reduce((a, b) => a + b, 0) / roiVals.length).toFixed(2)) : null;
    const allSignals = signals.data ?? [];
    const avgConfidence = allSignals.length ? Math.round(allSignals.reduce((sum, s) => sum + Number(s.confidence), 0) / allSignals.length) : null;
    const signalAction = (row: { market_signals: { action: string } | Array<{ action: string }> }) =>
      Array.isArray(row.market_signals) ? row.market_signals[0]?.action : row.market_signals.action;
    const byAction = ["FOLLOW", "WATCH", "ALERT", "FADE"].map((action) => {
      const rows = resolved.filter((r) => signalAction(r) === action);
      const dec = rows.filter((r) => r.outcome === "won" || r.outcome === "lost");
      const actionWins = dec.filter((r) => r.outcome === "won").length;
      return { action, signals: allSignals.filter((s) => s.action === action).length, resolved: rows.length, accuracy: dec.length ? Math.round((actionWins / dec.length) * 100) : null, averageRoi: rows.length ? Number((rows.reduce((sum, r) => sum + Number(r.roi_units ?? 0), 0) / rows.length).toFixed(2)) : null };
    });
    const ranked = byAction.filter((x) => x.accuracy !== null).sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0));
    return { totalSignals: total.count ?? null, signalsToday: todaySignals.count ?? null, highConfidenceAlerts: highConf.count ?? null, totalOddsUpdatesToday: oddsToday.count ?? null, accuracy, correctSignals: wins, incorrectSignals: losses, highConfidenceAccuracy: accuracy, averageRoi, avgConfidence, strategyPerformance: byAction, bestStrategy: ranked[0]?.action ?? null, worstStrategy: ranked.at(-1)?.action ?? null };
  } catch { return { totalSignals: null, signalsToday: null, highConfidenceAlerts: null, totalOddsUpdatesToday: null, accuracy: null, correctSignals: null, incorrectSignals: null, highConfidenceAccuracy: null, averageRoi: null, avgConfidence: null, strategyPerformance: [], bestStrategy: null, worstStrategy: null }; }
}

export const getStats = getLiveSignalStats;
export const getAnalytics = getLiveSignalStats;

export async function getOddsHistoryForLatestSignal(signal: { fixture_id: string; market: string }, limit = 60) {
  return getOddsHistory(signal.fixture_id, signal.market, limit);
}
