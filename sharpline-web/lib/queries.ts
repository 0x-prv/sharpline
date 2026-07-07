import { supabaseServer } from "./supabase-server";

export async function getFixtures() {
  try {
    const { data, error } = await supabaseServer.from("matches").select("*").order("kickoff_at", { ascending: false });
    return error ? [] : data ?? [];
  } catch { return []; }
}

export async function getLatestSignal() {
  try {
    const { data, error } = await supabaseServer.from("market_signals").select("*").order("occurred_at", { ascending: false }).limit(1).maybeSingle();
    return error ? null : data ?? null;
  } catch { return null; }
}

export async function getRecentSignals(limit = 10) {
  try {
    const { data, error } = await supabaseServer.from("market_signals").select("*").order("occurred_at", { ascending: false }).limit(limit);
    return error ? [] : data ?? [];
  } catch { return []; }
}

export async function getOddsHistory(fixtureId: string, market: string, limit = 60) {
  try {
    const { data, error } = await supabaseServer.from("odds_snapshots").select("*").eq("fixture_id", fixtureId).eq("market", market).order("received_at", { ascending: true }).limit(limit);
    return error ? [] : data ?? [];
  } catch { return []; }
}

export async function getStats() {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const { count: totalSignals } = await supabaseServer.from("market_signals").select("*", { count: "exact", head: true });
    const { count: signalsToday } = await supabaseServer.from("market_signals").select("*", { count: "exact", head: true }).gte("occurred_at", today.toISOString());
    const { count: highConfidenceAlerts } = await supabaseServer.from("market_signals").select("*", { count: "exact", head: true }).gte("confidence", 85);
    const { data: resolutions } = await supabaseServer.from("signal_resolutions").select("outcome");
    const resolved = resolutions ?? [];
    const wins = resolved.filter((r) => r.outcome === "won").length;
    const losses = resolved.filter((r) => r.outcome === "lost").length;
    const accuracy = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null;
    return { totalSignals: totalSignals ?? 0, signalsToday: signalsToday ?? 0, highConfidenceAlerts: highConfidenceAlerts ?? 0, accuracy };
  } catch { return { totalSignals: 0, signalsToday: 0, highConfidenceAlerts: 0, accuracy: null }; }
}
