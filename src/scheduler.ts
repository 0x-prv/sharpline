import { getFixturesSnapshot } from "./txline/client.js";

const WORLD_CUP_COMPETITION_ID = 72;
const PRE_MATCH_BUFFER_MS = 15 * 60 * 1000; // start listening 15 min before kickoff
const POST_MATCH_BUFFER_MS = 150 * 60 * 1000; // cover full match + extra time + buffer
const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // re-check fixture list every 10 min

type FixtureWindow = { fixtureId: string; start: number; end: number };

function txlineTimeMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}


let windows: FixtureWindow[] = [];

export async function refreshFixtureWindows() {
  const fixtures = await getFixturesSnapshot(WORLD_CUP_COMPETITION_ID);
  const normalizedFixtures = fixtures
    .map((f: any) => ({ fixtureId: String(f.FixtureId), startTime: txlineTimeMs(f.StartTime) }))
    .filter((f: { fixtureId: string; startTime: number | null }): f is { fixtureId: string; startTime: number } => Boolean(f.fixtureId) && f.startTime !== null);

  windows = normalizedFixtures.map((f: { fixtureId: string; startTime: number }) => ({
    fixtureId: f.fixtureId,
    start: f.startTime - PRE_MATCH_BUFFER_MS,
    end: f.startTime + POST_MATCH_BUFFER_MS,
  }));

  const now = Date.now();
  const activeWindows = windows.filter((w) => now >= w.start && now <= w.end).length;
  const upcomingWindows = windows.filter((w) => w.start > now).length;
  const expiredWindows = windows.filter((w) => w.end < now).length;
  console.log(JSON.stringify({
    level: "info",
    component: "scheduler",
    event: "fixture_window_refresh",
    txline_fixtures_returned: fixtures.length,
    fixtures_after_normalization: normalizedFixtures.length,
    fixtures_after_filtering: normalizedFixtures.length,
    monitoring_windows_created: windows.length,
    active_windows: activeWindows,
    upcoming_windows: upcomingWindows,
    expired_windows: expiredWindows,
    filter: "Boolean(String(FixtureId)) && txlineTimeMs(StartTime) !== null; active check is now >= startTime - 15m && now <= startTime + 150m",
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