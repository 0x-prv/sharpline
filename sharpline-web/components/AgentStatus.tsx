import { CheckCircle2 } from "lucide-react";

const CHECKS = [
  "Worker Running",
  "TxLINE Connected",
  "Fixtures Loaded",
  "Waiting for Kickoff",
  "Signal Engine Ready",
];

export function AgentStatus() {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Current Agent Status</p>
      <h2 className="mt-3 font-display text-2xl font-semibold text-text">Current Agent Status</h2>
      <p className="mt-4 max-w-4xl text-sm leading-6 text-text-muted">
        SharpLine has loaded today’s World Cup fixtures and is actively monitoring the TxLINE live feed. While no matches are currently live, the agent remains ready and will automatically begin processing odds movement as soon as kickoff begins.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-5">
        {CHECKS.map((check) => (
          <div key={check} className="rounded-xl border border-border bg-bg/50 p-4">
            <CheckCircle2 className="h-4 w-4 text-signal-green" />
            <p className="mt-3 text-sm text-text">{check}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
