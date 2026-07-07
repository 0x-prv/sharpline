import { Bot, Brain, Clock, LineChart, Radio } from "lucide-react";

type Signal = { occurred_at: string } | null;

export function MatchTimeline({ signal }: { signal: Signal }) {
  const time = signal ? new Date(signal.occurred_at).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }) : "Waiting";
  const events = [
    { time, title: "Odds updated", icon: Radio },
    { time, title: "Sharp movement detected", icon: LineChart },
    { time, title: "Signal generated", icon: Bot },
    { time, title: "AI explanation generated", icon: Brain },
    { time: "Now", title: "Tracking outcome...", icon: Clock },
  ];

  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Match Timeline</p>
      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-5">
        {events.map(({ time: eventTime, title, icon: Icon }, index) => (
          <div key={title} className="relative rounded-xl border border-border bg-bg/50 p-4">
            {index < events.length - 1 && <span className="absolute -right-2 top-1/2 hidden text-text-muted md:block">→</span>}
            <Icon className="h-4 w-4 text-signal-blue" />
            <p className="mt-4 text-xs text-text-muted">{eventTime}</p>
            <p className="mt-1 text-sm text-text">{title}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
