import { Bot, Brain, Flag, LineChart, Radio, Trophy } from "lucide-react";
import { explainAction, formatMarketSelection } from "./copy";

type Replay = {
  match: { home_team: string; away_team: string; kickoff_at: string | null; finished_at: string | null; home_score?: number | null; away_score?: number | null };
  odds: Array<{ received_at: string; market: string; selection: string; price: number; home_score?: number; away_score?: number }>;
  signals: Array<{ id: string; occurred_at: string; market: string; selection: string; action: string; confidence: number; explanation: string }>;
  resolutions: Array<{ resolved_at: string; outcome: string; roi_units: number; final_score?: string | null }>;
} | null;

export function MatchReplay({ replay }: { replay: Replay }) {
  const events = replay ? buildEvents(replay) : [];
  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Match Replay</p>
      <h2 className="mt-3 font-display text-2xl font-semibold text-text">Replay previous market movement.</h2>
      <p className="mt-2 text-sm leading-6 text-text-muted">Timeline built from matches, odds_snapshots, market_signals, and signal_resolutions production rows.</p>
      <div className="mt-5 space-y-3">
        {replay && events.length === 0 ? (
          <div className="rounded-xl border border-border bg-bg/50 p-6 text-sm text-text-muted">
            <p className="font-display text-base text-text">{replay.match.home_team} vs {replay.match.away_team} · Final {formatFinalScore(replay)}</p>
            <p className="mt-2">Replay unavailable — SharpLine was not running when this match was played.</p>
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-xl border border-border bg-bg/50 p-6 text-sm text-text-muted">Select a completed fixture with stored odds and signals to replay market movement.</div>
        ) : events.map(({ key, time, title, body, icon: Icon }) => (
          <div key={key} className="flex gap-3 rounded-xl border border-border bg-bg/50 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface"><Icon className="h-4 w-4 text-signal-blue" /></div>
            <div>
              <p className="font-data text-xs text-text-muted">{time}</p>
              <p className="mt-1 font-display text-base font-semibold text-text">{title}</p>
              <p className="mt-1 text-sm leading-6 text-text-muted">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function buildEvents(replay: NonNullable<Replay>) {
  const events = [];
  if (replay.match.kickoff_at) events.push({ key: "kickoff", at: replay.match.kickoff_at, time: formatTime(replay.match.kickoff_at), title: "Kickoff / match start", body: `${replay.match.home_team} vs ${replay.match.away_team} started.`, icon: Flag });
  replay.odds.slice(0, 8).forEach((tick, index) => events.push({ key: `odds-${index}`, at: tick.received_at, time: formatTime(tick.received_at), title: "Odds snapshot", body: `${formatMarketSelection(tick.market, tick.selection)} priced at ${Number(tick.price).toFixed(2)} with score ${tick.home_score ?? 0}-${tick.away_score ?? 0}.`, icon: Radio }));
  replay.signals.forEach((signal) => {
    events.push({ key: `signal-${signal.id}`, at: signal.occurred_at, time: formatTime(signal.occurred_at), title: "Signal generated", body: `${explainAction(signal.action)} at ${signal.confidence}% confidence for ${formatMarketSelection(signal.market, signal.selection)}.`, icon: Bot });
    events.push({ key: `explain-${signal.id}`, at: signal.occurred_at, time: formatTime(signal.occurred_at), title: "AI explanation event", body: signal.explanation || "AI explanation stored with the signal.", icon: Brain });
  });
  if (replay.match.finished_at) events.push({ key: "final", at: replay.match.finished_at, time: formatTime(replay.match.finished_at), title: "Final score", body: `Match finished ${formatFinalScore(replay)}.`, icon: Trophy });
  replay.resolutions.forEach((resolution, index) => events.push({ key: `resolution-${index}`, at: resolution.resolved_at, time: formatTime(resolution.resolved_at), title: "Resolution result", body: `${resolution.outcome.toUpperCase()} · ROI ${Number(resolution.roi_units ?? 0).toFixed(2)} units.`, icon: LineChart }));
  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()).map(({ at: _at, ...event }) => event);
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatFinalScore(replay: NonNullable<Replay>) {
  return replay.resolutions[0]?.final_score ?? (replay.match.home_score !== null && replay.match.home_score !== undefined && replay.match.away_score !== null && replay.match.away_score !== undefined ? `${replay.match.home_score}-${replay.match.away_score}` : "with final score pending");
}
