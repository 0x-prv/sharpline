import { CheckCircle2 } from "lucide-react";

type AgentState = { worker_status?: string | null; txline_status?: string | null; current_state?: string | null; notes?: string | null; odds_updates_processed?: number | null; signals_generated?: number | null; };

export function AgentStatus({ agentState }: { agentState: AgentState | null }) {
  const checks = [
    `Agent: ${title(agentState?.worker_status) ?? "Monitoring next kickoff"}`,
    `TxLINE: ${title(agentState?.txline_status) ?? "Monitoring next kickoff"}`,
    `State: ${stateLabel(agentState?.current_state)}`,
    `Odds updates: ${agentState?.odds_updates_processed ?? "Monitoring next kickoff"}`,
    `Signals: ${agentState?.signals_generated ?? "Monitoring next kickoff"}`,
  ];
  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Current Agent Status</p>
      <h2 className="mt-3 font-display text-2xl font-semibold text-text">Current Agent Status</h2>
      <p className="mt-4 max-w-4xl text-sm leading-6 text-text-muted">{agentState?.notes ?? "Monitoring next kickoff"}</p>
      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-5">
        {checks.map((check) => (<div key={check} className="rounded-xl border border-border bg-bg/50 p-4"><CheckCircle2 className="h-4 w-4 text-signal-green" /><p className="mt-3 text-sm text-text">{check}</p></div>))}
      </div>
    </section>
  );
}
function title(value?: string | null) { return value ? value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()) : null; }
function stateLabel(value?: string | null) { if (!value) return "Monitoring next kickoff"; if (value === "processing_live_match") return "Processing live match"; if (value === "waiting_for_kickoff") return "Monitoring next kickoff"; return "Monitoring live odds"; }
