import { supabaseServer } from "./supabase-server";

export async function getFixtures() {
  const { data, error } = await supabaseServer
    .from("fixtures")
    .select("*")
    .order("kickoff_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getLatestSignal() {
  const { data, error } = await supabaseServer
    .from("signals")
    .select("*")
    .order("detected_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getRecentSignals(limit = 10) {
  const { data, error } = await supabaseServer
    .from("signals")
    .select("*")
    .order("detected_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getOddsHistory(fixtureId: string, market: string, limit = 60) {
  const { data, error } = await supabaseServer
    .from("odds_ticks")
    .select("*")
    .eq("fixture_id", fixtureId)
    .eq("market", market)
    .order("received_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getStats() {
  const { count: totalSignals } = await supabaseServer
    .from("signals")
    .select("*", { count: "exact", head: true });

  const { count: explainedCount } = await supabaseServer
    .from("signals")
    .select("*", { count: "exact", head: true })
    .eq("classification", "explained");

  const { count: unexplainedCount } = await supabaseServer
    .from("signals")
    .select("*", { count: "exact", head: true })
    .eq("classification", "unexplained");

  const { count: wonCount } = await supabaseServer
    .from("signals")
    .select("*", { count: "exact", head: true })
    .eq("outcome", "won");

  const { count: resolvedCount } = await supabaseServer
    .from("signals")
    .select("*", { count: "exact", head: true })
    .neq("outcome", "pending");

  const accuracy =
    resolvedCount && resolvedCount > 0
      ? Math.round(((wonCount ?? 0) / resolvedCount) * 100)
      : null;

  return {
    totalSignals: totalSignals ?? 0,
    explainedCount: explainedCount ?? 0,
    unexplainedCount: unexplainedCount ?? 0,
    accuracy,
  };
}

export async function getRecentScoreEvents(fixtureId: string, limit = 10) {
  const { data, error } = await supabaseServer
    .from("score_events")
    .select("*")
    .eq("fixture_id", fixtureId)
    .order("received_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}