import { Activity, Clock, Database, Radio, RotateCcw, Server } from "lucide-react";

type AgentState = {
  worker_status?: string | null;
  txline_status?: string | null;
  fixtures_loaded?: number | null;
  events_processed?: number | null;
  reconnect_count?: number | null;
  last_heartbeat_at?: string | null;
};

export function AgentHealth({ agentState }: { agentState: AgentState | null }) {
  const items = [
    { label: "Agent", value: title(agentState?.worker_status) ?? "Monitoring next kickoff", icon: Server },
    { label: "Connection", value: title(agentState?.txline_status) ?? "Monitoring next kickoff", icon: Radio },
    { label: "Fixtures Loaded", value: formatCount(agentState?.fixtures_loaded), icon: Database },
    { label: "Agent Pulse", value: relativeTime(agentState?.last_heartbeat_at), icon: Clock },
    { label: "Events Processed", value: formatCount(agentState?.events_processed), icon: Activity },
    { label: "Reconnects", value: formatCount(agentState?.reconnect_count), icon: RotateCcw },
  ];

  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Agent Health</p>
      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {items.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-bg/50 p-4">
            <Icon className="h-4 w-4 text-text-muted" />
            <p className="mt-4 text-xs text-text-muted">{label}</p>
            <p className="mt-1 font-display text-lg font-semibold leading-tight text-text">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatCount(value: number | null | undefined) { return value === null || value === undefined ? "Monitoring next kickoff" : String(value); }
function title(value: string | null | undefined) { return value ? value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()) : null; }
function relativeTime(value: string | null | undefined) {
  if (!value) return "Monitoring next kickoff";
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}
