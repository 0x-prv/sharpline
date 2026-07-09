import { cache } from "react";

const FEED_URL = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

export type BracketTeam = { name: string; score: number | null; winner: boolean };
export type BracketMatch = { id: string; round: string; kickoff_at: string | null; home: BracketTeam; away: BracketTeam; status: "completed" | "upcoming" | "in_progress" | "tbd" };
export type BracketRound = { name: string; active: boolean; matches: BracketMatch[] };
export type TournamentBracketData = { rounds: BracketRound[]; groupStage: BracketMatch[]; sourceUrl: string; updatedAt: string | null };

type RawFeed = { matches?: RawMatch[]; rounds?: Array<{ name?: string; matches?: RawMatch[] }> };
type RawMatch = Record<string, unknown>;

let lastGoodFeed: RawFeed | null = null;

export const getWorldCupBracket = cache(async (): Promise<TournamentBracketData> => {
  const feed = await fetchFeed();
  return parseFeed(feed);
});

async function fetchFeed(): Promise<RawFeed> {
  try {
    const response = await fetch(FEED_URL, { next: { revalidate: 3600 } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = (await response.json()) as RawFeed;
    lastGoodFeed = json;
    return json;
  } catch (error) {
    console.error("[worldCupBracketFeed] failed to fetch feed", error);
    return lastGoodFeed ?? { matches: [] };
  }
}

function parseFeed(feed: RawFeed): TournamentBracketData {
  const rawMatches = flattenMatches(feed);
  const allMatches = rawMatches.map(toBracketMatch);
  const groupStage = allMatches.filter((match) => /group/i.test(match.round));
  const roundNames = ["Round of 32", "Round of 16", "Quarterfinals", "Semifinals", "Final"];
  const rounds = roundNames.map((name) => ({ name, active: false, matches: matchesForRound(allMatches, name) }));
  const activeIndex = Math.max(0, rounds.findLastIndex((round) => round.matches.some((match) => match.status === "completed" || match.status === "in_progress")));
  return { rounds: rounds.map((round, index) => ({ ...round, active: index === activeIndex })), groupStage, sourceUrl: FEED_URL, updatedAt: new Date().toISOString() };
}

function flattenMatches(feed: RawFeed): RawMatch[] {
  if (Array.isArray(feed.matches)) return feed.matches;
  return (feed.rounds ?? []).flatMap((round) => (round.matches ?? []).map((match) => ({ ...match, round: match.round ?? round.name })));
}

function matchesForRound(matches: BracketMatch[], roundName: string) {
  const found = matches.filter((match) => normalizeRound(match.round) === roundName);
  if (found.length) return found;
  const expected = roundName === "Round of 32" ? 16 : roundName === "Round of 16" ? 8 : roundName === "Quarterfinals" ? 4 : roundName === "Semifinals" ? 2 : 1;
  return Array.from({ length: expected }, (_, index) => placeholderMatch(roundName, index));
}

function toBracketMatch(match: RawMatch, index: number): BracketMatch {
  const round = normalizeRound(text(match.round ?? match.stage ?? match.group ?? "Group Stage"));
  const homeName = teamName(match.team1 ?? match.home_team ?? match.home ?? match.team_a);
  const awayName = teamName(match.team2 ?? match.away_team ?? match.away ?? match.team_b);
  const [homeScore, awayScore] = scores(match);
  const completed = homeScore !== null && awayScore !== null;
  const winner = completed ? homeScore === awayScore ? winnerName(match) : homeScore > awayScore ? homeName : awayName : null;
  return { id: text(match.id ?? `${round}-${index}`), round, kickoff_at: kickoff(match), home: { name: homeName, score: homeScore, winner: winner === homeName }, away: { name: awayName, score: awayScore, winner: winner === awayName }, status: completed ? "completed" : homeName === "TBD" || awayName === "TBD" ? "tbd" : isPast(kickoff(match)) ? "in_progress" : "upcoming" };
}

function placeholderMatch(round: string, index: number): BracketMatch { return { id: `${round}-${index}`, round, kickoff_at: null, home: { name: "TBD", score: null, winner: false }, away: { name: "TBD", score: null, winner: false }, status: "tbd" }; }
function normalizeRound(value: string) { const v = value.toLowerCase(); if (v.includes("32")) return "Round of 32"; if (v.includes("16")) return "Round of 16"; if (v.includes("quarter")) return "Quarterfinals"; if (v.includes("semi")) return "Semifinals"; if (v.includes("final") && !v.includes("third")) return "Final"; return value || "Group Stage"; }
function teamName(value: unknown) { return typeof value === "string" ? value : value && typeof value === "object" && "name" in value ? text((value as { name?: unknown }).name) : "TBD"; }
function kickoff(match: RawMatch) { const value = text(match.date ?? match.kickoff_at ?? match.datetime ?? match.time); return value || null; }
function isPast(value: string | null) { return value ? new Date(value).getTime() <= Date.now() : false; }
function text(value: unknown) { return value === null || value === undefined ? "" : String(value); }
function winnerName(match: RawMatch) { return teamName(match.winner ?? match.winner_team ?? match.winnerName); }
function scores(match: RawMatch): [number | null, number | null] { const score = match.score as { ft?: unknown; fulltime?: unknown; full_time?: unknown } | undefined; const pair = Array.isArray(score?.ft) ? score?.ft : Array.isArray(score?.fulltime) ? score?.fulltime : Array.isArray(score?.full_time) ? score?.full_time : null; if (pair) return [num(pair[0]), num(pair[1])]; return [num(match.score1 ?? match.home_score ?? match.goals1), num(match.score2 ?? match.away_score ?? match.goals2)]; }
function num(value: unknown) { const n = typeof value === "number" ? value : typeof value === "string" && value !== "" ? Number(value) : NaN; return Number.isFinite(n) ? n : null; }
