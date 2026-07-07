import { getFixturesSnapshot } from "./txline/client.js";

const WORLD_CUP_COMPETITION_ID = 72;
const PRE_MATCH_BUFFER_MS = 15 * 60 * 1000; // start listening 15 min before kickoff
const POST_MATCH_BUFFER_MS = 150 * 60 * 1000; // cover full match + extra time + buffer
const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // re-check fixture list every 10 min

type FixtureWindow = { fixtureId: string; start: number; end: number };

let windows: FixtureWindow[] = [];

export async function refreshFixtureWindows() {
  const fixtures = await getFixturesSnapshot(WORLD_CUP_COMPETITION_ID);

  windows = fixtures
    .filter((f: any) => typeof f.StartTime === "number")
    .map((f: any) => ({
      fixtureId: String(f.FixtureId),
      start: f.StartTime - PRE_MATCH_BUFFER_MS,
      end: f.StartTime + POST_MATCH_BUFFER_MS,
    }));

  console.log(`[scheduler] refreshed ${windows.length} fixture windows`);
}

export function isAnyMatchActive(now: number = Date.now()): boolean {
  return windows.some((w) => now >= w.start && now <= w.end);
}

export function msUntilNextWindowChange(now: number = Date.now()): number {
  const active = isAnyMatchActive(now);

  if (active) {
    const activeEnds = windows
      .filter((w) => now >= w.start && now <= w.end)
      .map((w) => w.end);
    return Math.min(...activeEnds) - now;
  }

  const upcomingStarts = windows.filter((w) => w.start > now).map((w) => w.start);
  if (upcomingStarts.length === 0) return REFRESH_INTERVAL_MS;
  return Math.min(...upcomingStarts) - now;
}

export { REFRESH_INTERVAL_MS };