import { Activity, Clock, Database, Radio, RotateCcw, Server } from "lucide-react";

type AgentHealthProps = {
  fixtureCount: number;
  eventsProcessed: number;
  lastUpdate?: Date;
};

export function AgentHealth({ fixtureCount, eventsProcessed, lastUpdate = new Date() }: AgentHealthProps) {
  const items = [
    { label: "Worker", value: "Running", icon: Server },
    { label: "Connection", value: "Healthy", icon: Radio },
    { label: "Fixtures Loaded", value: String(fixtureCount), icon: Database },
    { label: "Last Update", value: isRecent(lastUpdate) ? "Just now" : lastUpdate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }), icon: Clock },
    { label: "Events Processed", value: eventsProcessed > 0 ? String(eventsProcessed) : "No live events yet", icon: Activity },
    { label: "Reconnects", value: "0", icon: RotateCcw },
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

function isRecent(date: Date) {
  return Date.now() - date.getTime() < 60_000;
}
