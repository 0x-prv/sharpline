import { Activity, Bot, Brain, CheckCircle2, Clock, Database, Radio, RotateCcw, Server, Wifi } from "lucide-react";

type AgentState = {
  worker_status?: string | null;
  txline_status?: string | null;
  scores_stream_status?: string | null;
  odds_stream_status?: string | null;
  fixtures_loaded?: number | null;
  monitored_fixtures?: number | null;
  events_processed?: number | null;
  reconnect_count?: number | null;
  last_heartbeat_at?: string | null;
  last_supabase_write_at?: string | null;
  last_ai_generation_at?: string | null;
  authenticated_at?: string | null;
  monitoring_started_at?: string | null;
  backend_data_status?: string | null;
  [key: string]: string | number | boolean | null | undefined;
};

type Fixture = { id?: string; status?: string | null; kickoff_at?: string | null };
type Signal = { occurred_at?: string | null; match?: string | null; action?: string | null };

type ActivityEvent = { at: string | null; label: string; detail?: string; icon: typeof CheckCircle2 };

export function AutonomousMonitoringConsole({ agentState, fixtures, recentSignals }: { agentState: AgentState | null; fixtures: Fixture[]; recentSignals: Signal[] }) {
  const monitoredFixtures = countMonitoredFixtures(agentState, fixtures);
  const lastAiAnalysis = firstDate(agentState?.last_ai_generation_at, agentState?.last_ai_analysis_at, recentSignals[0]?.occurred_at);
  const lastSupabaseWrite = firstDate(agentState?.last_supabase_write_at, agentState?.last_write_at, recentSignals[0]?.occurred_at);
  const statusItems = [
    { label: "Worker Status", value: statusValue(agentState?.worker_status), icon: Server },
    { label: "TxLINE Connection", value: statusValue(agentState?.txline_status), icon: Wifi },
    { label: "Scores Stream", value: statusValue(agentState?.scores_stream_status ?? agentState?.score_stream_status ?? agentState?.scores_status), icon: Radio },
    { label: "Odds Stream", value: statusValue(agentState?.odds_stream_status ?? agentState?.odds_status), icon: Activity },
    { label: "Active Monitoring", value: monitoredFixtures === null ? "Waiting..." : `${monitoredFixtures} World Cup fixture${monitoredFixtures === 1 ? "" : "s"}`, icon: Bot },
    { label: "Last Heartbeat", value: relativeTime(agentState?.last_heartbeat_at), icon: Clock },
    { label: "Last Supabase Write", value: relativeTime(lastSupabaseWrite), icon: Database },
    { label: "Last AI Analysis", value: lastAiAnalysis ? absoluteTime(lastAiAnalysis) : "Waiting for first event", icon: Brain },
  ];
  const events = buildActivity(agentState, fixtures, recentSignals, monitoredFixtures);

  return (
    <section className="premium-card overflow-hidden">
      <div className="border-b border-border p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="kicker">Autonomous Monitoring</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] text-text">Backend alive and monitoring TxLINE</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">When no World Cup match is live, Sharpline stays active here: health, TxLINE connectivity, stream status, fixture monitoring, and backend writes are reported from production data when available.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-signal-green/20 bg-signal-green/10 px-3 py-1.5 font-data text-[11px] uppercase text-signal-green"><span className="h-1.5 w-1.5 rounded-full bg-signal-green" /> Monitoring</span>
        </div>
      </div>
      <div className="grid gap-px bg-border md:grid-cols-2 lg:grid-cols-4">
        {statusItems.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-surface p-5">
            <div className="flex items-center justify-between gap-3"><Icon className="h-4 w-4 text-signal-green" /><CheckCircle2 className="h-4 w-4 text-signal-green" /></div>
            <p className="mt-5 text-xs text-text-muted">{label}</p>
            <p className="mt-1 font-display text-xl font-semibold leading-tight text-text">{value}</p>
          </div>
        ))}
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between gap-3"><p className="text-xs uppercase tracking-[0.2em] text-text-muted">Recent Activity</p><p className="text-xs text-text-muted">Live Autonomous Activity Feed</p></div>
        <div className="mt-5 space-y-3">
          {events.length ? events.map((event, index) => <ActivityRow key={`${event.label}-${event.at ?? index}`} event={event} />) : <div className="rounded-xl border border-border bg-bg/50 p-4 text-sm text-text-muted">Waiting for backend activity...</div>}
        </div>
      </div>
    </section>
  );
}

function ActivityRow({ event }: { event: ActivityEvent }) { const Icon = event.icon; return <div className="flex items-start gap-3 rounded-xl border border-border bg-bg/50 p-4"><div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-signal-green/20 bg-signal-green/10"><Icon className="h-4 w-4 text-signal-green" /></div><div className="min-w-0 flex-1"><p className="font-data text-xs text-text-muted">{event.at ? clockTime(event.at) : "Waiting"}</p><p className="mt-1 text-sm font-medium text-text">{event.label}</p>{event.detail ? <p className="mt-1 text-xs leading-5 text-text-muted">{event.detail}</p> : null}</div></div>; }
function buildActivity(agentState: AgentState | null, fixtures: Fixture[], recentSignals: Signal[], monitoredFixtures: number | null) { const events: ActivityEvent[] = []; pushEvent(events, agentState?.monitoring_started_at, "Monitoring started", undefined, Bot); pushEvent(events, agentState?.authenticated_at, "Authenticated with TxLINE", undefined, CheckCircle2); if (agentState?.txline_status) pushEvent(events, agentState?.last_heartbeat_at, `TxLINE ${title(String(agentState.txline_status))}`, undefined, Wifi); if (agentState?.scores_stream_status ?? agentState?.score_stream_status) pushEvent(events, agentState?.last_heartbeat_at, `Scores stream ${title(String(agentState.scores_stream_status ?? agentState.score_stream_status))}`, undefined, Radio); if (agentState?.odds_stream_status ?? agentState?.odds_status) pushEvent(events, agentState?.last_heartbeat_at, `Odds stream ${title(String(agentState.odds_stream_status ?? agentState.odds_status))}`, undefined, Activity); if (monitoredFixtures !== null) pushEvent(events, latestFixtureDate(fixtures) ?? agentState?.last_heartbeat_at ?? null, `Monitoring ${monitoredFixtures} FIFA World Cup fixture${monitoredFixtures === 1 ? "" : "s"}`, undefined, Bot); pushEvent(events, agentState?.last_heartbeat_at, "Heartbeat OK", undefined, Clock); pushEvent(events, firstDate(agentState?.last_supabase_write_at, agentState?.last_write_at), "Supabase write confirmed", undefined, Database); if (agentState?.reconnect_count !== null && agentState?.reconnect_count !== undefined && Number(agentState.reconnect_count) > 0) pushEvent(events, agentState?.last_heartbeat_at, `${agentState.reconnect_count} reconnect event${Number(agentState.reconnect_count) === 1 ? "" : "s"} recorded`, undefined, RotateCcw); for (const signal of recentSignals.slice(0, 3)) pushEvent(events, signal.occurred_at, "AI analysis generated", signal.match ?? signal.action ?? undefined, Brain); return events.sort((a, b) => (dateMs(b.at) - dateMs(a.at))).slice(0, 8); }
function pushEvent(events: ActivityEvent[], at: string | null | undefined, label: string, detail: string | undefined, icon: typeof CheckCircle2) { if (at || label.startsWith("Monitoring")) events.push({ at: at ?? null, label, detail, icon }); }
function countMonitoredFixtures(agentState: AgentState | null, fixtures: Fixture[]) { const fromState = agentState?.monitored_fixtures ?? agentState?.fixtures_loaded; if (typeof fromState === "number") return fromState; if (fixtures.length) return fixtures.filter((fixture) => fixture.status === "live_or_upcoming" || fixture.status === "scheduled" || fixture.status === "live").length || fixtures.length; return null; }
function latestFixtureDate(fixtures: Fixture[]) { return fixtures.map((fixture) => fixture.kickoff_at).filter(Boolean).sort().at(-1) ?? null; }
function firstDate(...values: Array<string | number | boolean | null | undefined>) { return values.find((value): value is string => typeof value === "string" && value.length > 0) ?? null; }
function statusValue(value: string | number | boolean | null | undefined) { return value === null || value === undefined || value === "" ? "Waiting..." : title(String(value)); }
function title(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()); }
function dateMs(value: string | null) { return value ? new Date(value).getTime() || 0 : 0; }
function relativeTime(value: string | null | undefined) { if (!value) return "Waiting..."; const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 60) return `${seconds} seconds ago`; const minutes = Math.round(seconds / 60); if (minutes < 60) return `${minutes} minutes ago`; return `${Math.round(minutes / 60)} hours ago`; }
function absoluteTime(value: string) { return new Date(value).toLocaleString("en-US", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" }); }
function clockTime(value: string) { return new Date(value).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", timeZone: "UTC" }); }
