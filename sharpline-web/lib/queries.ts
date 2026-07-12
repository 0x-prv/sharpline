import { supabaseServer } from "./supabase-server";
import { getWorldCupBracket, type BracketMatch } from "./worldCupBracketFeed";

const TERMINAL_MATCH_STATUS = "finished";
const ACTIVE_MATCH_STATUSES = ["scheduled", "live_or_upcoming", "live"];

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
  anchor_tx_signature: string | null;
};


export type SignalAccuracyAction = { action: "ALERT" | "FADE" | "FOLLOW" | "WATCH"; total: number; correct: number; accuracy: number | null };
export type SignalAccuracyPoint = { label: string; resolvedAt: string; accuracy: number; correct: number; total: number };
export type SignalAccuracyStats = {
  totalSignals: number;
  resolvedSignals: number;
  correctSignals: number;
  overallAccuracy: number | null;
  byAction: SignalAccuracyAction[];
  cumulative: SignalAccuracyPoint[];
};


export type AgentReasoningLogEntry = {
  id: string;
  action: string;
  confidence: number | null;
  reason_code: string | null;
  explanation: string | null;
  occurred_at: string | null;
};


export type AnchorLedgerEntry = {
  id: string;
  match: string | null;
  action: string | null;
  occurred_at: string | null;
  resolved_at: string | null;
  anchor_tx_signature: string;
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
  anchor_tx_signature: string | null;
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
    const now = new Date().toISOString();
    const { data, error } = await supabaseServer
      .from("matches")
      .select("*")
      .eq("is_demo", false)
      .in("status", ACTIVE_MATCH_STATUSES)
      .is("finished_at", null)
      .or(`status.in.(live,live_or_upcoming),and(status.eq.scheduled,kickoff_at.gte.${now})`)
      .order("kickoff_at", { ascending: true });
    if (error) { console.error("[queries] query error", error.message); return []; }
    return data ?? [];
  } catch (err) { console.error("[queries] query exception", err); return []; }
}

export const getFixtures = getLiveFixtures;

export async function getNextFixture() {
  const fixtures = await getLiveFixtures();
  if (!fixtures.length) return null;
  try {
    const bracket = await getWorldCupBracket();
    const bracketFixtures = upcomingActiveBracketMatches(bracket.rounds.flatMap((round) => round.matches));
    return fixtures.find((fixture) => appearsInBracketFixtures(fixture, bracketFixtures)) ?? null;
  } catch (err) {
    console.error("[queries] getNextFixture bracket validation error", err);
    return fixtures[0] ?? null;
  }
}

function upcomingActiveBracketMatches(matches: BracketMatch[]) {
  const now = Date.now();
  return matches.filter((match) =>
    (match.status === "upcoming" || match.status === "in_progress")
    && match.home.name !== "TBD"
    && match.away.name !== "TBD"
    && (!match.kickoff_at || new Date(match.kickoff_at).getTime() >= now)
  );
}

function appearsInBracketFixtures(fixture: { home_team?: string | null; away_team?: string | null }, bracketFixtures: BracketMatch[]) {
  const fixtureTeams = teamPair(fixture.home_team, fixture.away_team);
  return bracketFixtures.some((match) => samePair(fixtureTeams, teamPair(match.home.name, match.away.name)));
}

function teamPair(home?: string | null, away?: string | null) { return [normalizeTeamName(home), normalizeTeamName(away)].sort(); }
function samePair(left: string[], right: string[]) { return left[0] === right[0] && left[1] === right[1]; }
function normalizeTeamName(value?: string | null) { return (value ?? "").toLowerCase().replace(/\b(united states|united states of america|usmnt)\b/g, "usa").replace(/[^a-z0-9]+/g, "").trim(); }

export async function getCompletedMatches(limit = 6): Promise<CompletedMatch[]> {
  try {
    const { data: matches, error } = await supabaseServer
      .from("matches")
      .select("id, home_team, away_team, status, kickoff_at, finished_at, home_score, away_score")
      .eq("is_demo", false)
      .or(`finished_at.not.is.null,status.eq.${TERMINAL_MATCH_STATUS}`)
      .order("finished_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) { console.error("[queries] getCompletedMatches error", error.message); return []; }
    if (!matches?.length) return [];

    const fixtureIds = matches.map((match) => match.id);
    const [signalsRes, resolutionsRes, oddsRes] = await Promise.all([
      supabaseServer.from("market_signals").select("id, fixture_id, action, confidence, movement_pct, occurred_at, outcome, roi_units, final_score").eq("is_demo", false).in("fixture_id", fixtureIds),
      supabaseServer.from("signal_resolutions").select("outcome, roi_units, final_score, anchor_tx_signature, market_signals!inner(id, fixture_id, is_demo, action, confidence, movement_pct)").eq("market_signals.is_demo", false).in("market_signals.fixture_id", fixtureIds),
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
        anchor_tx_signature: matchResolutions.find((row) => row.anchor_tx_signature)?.anchor_tx_signature ?? null,
      };
    });
  } catch (err) { console.error("[queries] query exception", err); return []; }
}

export async function getSignalAccuracyStats(): Promise<SignalAccuracyStats> {
  const empty: SignalAccuracyStats = {
    totalSignals: 0,
    resolvedSignals: 0,
    correctSignals: 0,
    overallAccuracy: null,
    byAction: ["ALERT", "FADE", "FOLLOW", "WATCH"].map((action) => ({ action: action as SignalAccuracyAction["action"], total: 0, correct: 0, accuracy: null })),
    cumulative: [],
  };

  try {
    const [totalRes, resolutionsRes] = await Promise.all([
      supabaseServer.from("market_signals").select("*", { count: "exact", head: true }).eq("is_demo", false),
      supabaseServer
        .from("signal_resolutions")
        .select("outcome, resolved_at, market_signals!inner(is_demo, action)")
        .eq("market_signals.is_demo", false)
        .order("resolved_at", { ascending: true }),
    ]);

    if (totalRes.error) console.error("[queries] getSignalAccuracyStats total error", totalRes.error.message);
    if (resolutionsRes.error) {
      console.error("[queries] getSignalAccuracyStats resolutions error", resolutionsRes.error.message);
      return { ...empty, totalSignals: totalRes.count ?? 0 };
    }

    const rows = resolutionsRes.data ?? [];
    const totalSignals = totalRes.count ?? 0;
    const resolvedSignals = rows.length;
    const correctSignals = rows.filter((row) => row.outcome === "won").length;
    const overallAccuracy = resolvedSignals ? Math.round((correctSignals / resolvedSignals) * 100) : null;

    const byAction = empty.byAction.map(({ action }) => {
      const actionRows = rows.filter((row) => relation(row.market_signals)?.action === action);
      const correct = actionRows.filter((row) => row.outcome === "won").length;
      return { action, total: actionRows.length, correct, accuracy: actionRows.length ? Math.round((correct / actionRows.length) * 100) : null };
    });

    let runningCorrect = 0;
    const cumulative = rows.map((row, index) => {
      if (row.outcome === "won") runningCorrect += 1;
      const total = index + 1;
      const resolvedAt = row.resolved_at ?? "";
      return {
        label: resolvedAt ? new Date(resolvedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : `#${total}`,
        resolvedAt,
        accuracy: Math.round((runningCorrect / total) * 100),
        correct: runningCorrect,
        total,
      };
    });

    return { totalSignals, resolvedSignals, correctSignals, overallAccuracy, byAction, cumulative };
  } catch (err) {
    console.error("[queries] getSignalAccuracyStats exception", err);
    return empty;
  }
}

export async function getOnChainAnchorLedger(limit = 12): Promise<AnchorLedgerEntry[]> {
  try {
    const { data, error } = await supabaseServer
      .from("signal_resolutions")
      .select("id, resolved_at, anchor_tx_signature, market_signals!inner(match, action, occurred_at, is_demo)")
      .eq("market_signals.is_demo", false)
      .not("anchor_tx_signature", "is", null)
      .order("resolved_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) { console.error("[queries] getOnChainAnchorLedger error", error.message); return []; }
    return (data ?? []).flatMap((row) => {
      const signal = relation(row.market_signals);
      if (!row.anchor_tx_signature) return [];
      return [{
        id: row.id,
        match: signal?.match ?? null,
        action: signal?.action ?? null,
        occurred_at: signal?.occurred_at ?? null,
        resolved_at: row.resolved_at ?? null,
        anchor_tx_signature: row.anchor_tx_signature,
      }];
    });
  } catch (err) { console.error("[queries] getOnChainAnchorLedger exception", err); return []; }
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
      .select("outcome, roi_units, final_score, resolved_at, anchor_tx_signature, market_signals!inner(id, fixture_id, match, market, selection, action, confidence, movement_pct, previous_odds, current_odds, reason_code, explanation, occurred_at, is_demo)")
      .eq("market_signals.is_demo", false)
      .order("resolved_at", { ascending: false })
      .limit(limit);
    if (error) { console.error("[queries] getResolvedSignals error", error.message); return []; }
    return (data ?? []).map((row) => {
      const signal = relation(row.market_signals);
      return { ...signal, outcome: row.outcome, roi_units: row.roi_units, resolved_at: row.resolved_at, final_score: row.final_score, anchor_tx_signature: row.anchor_tx_signature } as ResolvedSignal;
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

export async function getAgentReasoningLog(limit = 30): Promise<AgentReasoningLogEntry[]> {
  try {
    const { data, error } = await supabaseServer
      .from("market_signals")
      .select("id, action, confidence, reason_code, explanation, occurred_at")
      .eq("is_demo", false)
      .not("explanation", "is", null)
      .order("occurred_at", { ascending: false })
      .limit(limit);
    if (error) { console.error("[queries] getAgentReasoningLog error", error.message); return []; }
    return (data ?? []).slice().reverse();
  } catch (err) { console.error("[queries] getAgentReasoningLog exception", err); return []; }
}

export async function getOddsHistory(fixtureId: string, market: string, limit = 60, selection?: string) {
  try {
    let query = supabaseServer.from("odds_snapshots").select("*").eq("fixture_id", fixtureId).eq("market", market).eq("is_demo", false);
    if (selection) query = query.eq("selection", selection);
    const { data, error } = await query.order("received_at", { ascending: true }).limit(limit);
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
      supabaseServer.from("matches").select("*", { count: "exact", head: true }).eq("is_demo", false).or(`finished_at.not.is.null,status.eq.${TERMINAL_MATCH_STATUS}`),
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

export async function getOddsHistoryForLatestSignal(signal: { fixture_id: string; market: string; selection?: string }, limit = 60) {
  return getOddsHistory(signal.fixture_id, signal.market, limit, "selection" in signal ? (signal as { selection?: string }).selection : undefined);
}

function relation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export type MatchMomentumPoint = { key: string; label: string; timestamp: string | null; minute: number | null; momentum: number };
export type MatchMomentumMarker = { key: string; label: string; momentum: number; title: string; kind: "event" | "signal" | "analysis" };
export type MatchMomentumTimelineData = { fixtureId: string; matchLabel: string; points: MatchMomentumPoint[]; markers: MatchMomentumMarker[] };

type TimelineRow = Record<string, unknown>;

export async function getMatchMomentumTimeline(fixtureId: string): Promise<MatchMomentumTimelineData | null> {
  try {
    const [matchRes, insightsRes, eventsRes, signalsRes] = await Promise.all([
      supabaseServer.from("matches").select("id, home_team, away_team, is_demo").eq("is_demo", false).eq("id", fixtureId).maybeSingle(),
      supabaseServer.from("match_insights").select("*").eq("fixture_id", fixtureId).eq("is_demo", false).order("created_at", { ascending: true }).limit(120),
      supabaseServer.from("match_events").select("*").eq("fixture_id", fixtureId).eq("is_demo", false).order("occurred_at", { ascending: true }).limit(120),
      supabaseServer.from("market_signals").select("id, fixture_id, action, confidence, movement_pct, occurred_at, is_demo").eq("fixture_id", fixtureId).eq("is_demo", false).order("occurred_at", { ascending: true }).limit(120),
    ]);
    if (matchRes.error) { console.error("[queries] getMatchMomentumTimeline match error", matchRes.error.message); return null; }
    if (insightsRes.error) { console.error("[queries] getMatchMomentumTimeline insights error", insightsRes.error.message); return null; }
    if (!matchRes.data || matchRes.data.is_demo) return null;

    const points = (insightsRes.data ?? []).map(toMomentumPoint).filter((point): point is MatchMomentumPoint => Boolean(point)).sort(compareTimelinePoints);
    if (points.length < 2) return null;

    const markers: MatchMomentumMarker[] = [];
    if (eventsRes.error) console.error("[queries] getMatchMomentumTimeline events error", eventsRes.error.message);
    else for (const event of eventsRes.data ?? []) pushTimelineMarker(markers, event, points, "event");
    if (signalsRes.error) console.error("[queries] getMatchMomentumTimeline signals error", signalsRes.error.message);
    else for (const signal of signalsRes.data ?? []) pushTimelineMarker(markers, signal, points, "signal");
    for (const insight of insightsRes.data ?? []) pushTimelineMarker(markers, insight, points, "analysis");

    return { fixtureId, matchLabel: `${matchRes.data.home_team} vs ${matchRes.data.away_team}`, points, markers: dedupeMarkers(markers).slice(0, 12) };
  } catch (err) { console.error("[queries] getMatchMomentumTimeline exception", err); return null; }
}

function toMomentumPoint(row: TimelineRow): MatchMomentumPoint | null {
  const momentum = numberFrom(row.momentum_score ?? row.momentum ?? row.momentum_value ?? row.home_momentum ?? row.signal_strength);
  if (momentum === null) return null;
  const minute = numberFrom(row.minute ?? row.match_minute ?? row.elapsed_minute);
  const timestamp = stringFrom(row.event_timestamp ?? row.occurred_at ?? row.created_at ?? row.generated_at ?? row.received_at);
  if (minute === null && !timestamp) return null;
  const key = timelineKey(minute, timestamp);
  return { key, label: minute !== null ? `${minute}'` : clockLabel(timestamp!), timestamp, minute, momentum };
}

function pushTimelineMarker(markers: MatchMomentumMarker[], row: TimelineRow, points: MatchMomentumPoint[], kind: MatchMomentumMarker["kind"]) {
  const minute = numberFrom(row.minute ?? row.match_minute ?? row.elapsed_minute);
  const timestamp = stringFrom(row.event_timestamp ?? row.occurred_at ?? row.created_at ?? row.generated_at ?? row.received_at);
  if (minute === null && !timestamp) return;
  const nearest = nearestPoint(points, minute, timestamp);
  if (!nearest) return;
  markers.push({ key: `${kind}-${String(row.id ?? markers.length)}-${nearest.key}`, label: nearest.label, momentum: nearest.momentum, title: markerTitle(row, kind), kind });
}

function nearestPoint(points: MatchMomentumPoint[], minute: number | null, timestamp: string | null) {
  if (minute !== null) return points.slice().sort((a, b) => Math.abs((a.minute ?? 9999) - minute) - Math.abs((b.minute ?? 9999) - minute))[0] ?? null;
  const target = timestamp ? new Date(timestamp).getTime() : NaN;
  if (!Number.isFinite(target)) return null;
  return points.filter((p) => p.timestamp).sort((a, b) => Math.abs(new Date(a.timestamp!).getTime() - target) - Math.abs(new Date(b.timestamp!).getTime() - target))[0] ?? null;
}

function markerTitle(row: TimelineRow, kind: MatchMomentumMarker["kind"]) { return stringFrom(row.title ?? row.event_type ?? row.type ?? row.action ?? row.summary ?? row.reason_code) ?? (kind === "signal" ? "Signal generated" : kind === "analysis" ? "Match insight generated" : "Match event"); }
function dedupeMarkers(markers: MatchMomentumMarker[]) { const seen = new Set<string>(); return markers.filter((marker) => { const key = `${marker.kind}-${marker.label}-${marker.title}`; if (seen.has(key)) return false; seen.add(key); return true; }); }
function compareTimelinePoints(a: MatchMomentumPoint, b: MatchMomentumPoint) { if (a.minute !== null && b.minute !== null) return a.minute - b.minute; return dateMs(a.timestamp) - dateMs(b.timestamp); }
function timelineKey(minute: number | null, timestamp: string | null) { return minute !== null ? `m-${minute}` : `t-${timestamp}`; }
function clockLabel(value: string) { return new Date(value).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", timeZone: "UTC" }); }
function numberFrom(value: unknown) { const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN; return Number.isFinite(parsed) ? parsed : null; }
function stringFrom(value: unknown) { return typeof value === "string" && value.length > 0 ? value : null; }
function dateMs(value: string | null) { return value ? new Date(value).getTime() || 0 : 0; }
