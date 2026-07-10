"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { actionTone, explainAction, formatMarketSelection } from "./copy";

type Stats = {
  completedMatches?: number | null;
  totalSignals: number | null;
  correctSignals?: number | null;
  incorrectSignals?: number | null;
  accuracy: number | null;
  highConfidenceAccuracy?: number | null;
  averageRoi?: number | null;
  strategyPerformance?: Array<{ action: string; signals: number; resolved: number; accuracy: number | null; averageRoi: number | null }>;
};

type Signal = {
  match: string;
  market: string;
  selection: string;
  action: string;
  confidence: number;
  occurred_at: string;
};

export function AnalyticsPanel({ stats, signals }: { stats: Stats; signals: Signal[] }) {
  const strategyData = stats.strategyPerformance?.length
    ? stats.strategyPerformance.map((item) => ({ strategy: item.action, signals: item.signals, accuracy: item.accuracy, averageRoi: item.averageRoi }))
    : ["FOLLOW", "WATCH", "ALERT"].map((strategy) => ({ strategy, signals: signals.filter((signal) => signal.action === strategy).length, accuracy: null, averageRoi: null }));

  const accuracyData = [
    { label: "Correct", value: stats.correctSignals ?? 0 },
    { label: "Incorrect", value: stats.incorrectSignals ?? 0 },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-2xl border border-border bg-surface p-6 lg:col-span-2">
        <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Analytics Coverage</p>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Metric label="Completed Matches" value={stats.completedMatches ?? 0} />
          <Metric label="Captured Signals" value={stats.totalSignals ?? 0} />
          <Metric label="Resolved Signals" value={(stats.correctSignals ?? 0) + (stats.incorrectSignals ?? 0)} />
          <Metric label="Accuracy" value={stats.accuracy === null ? "Awaiting data" : `${stats.accuracy}%`} />
          <Metric label="ROI" value={stats.averageRoi === null || stats.averageRoi === undefined ? "Awaiting data" : `${stats.averageRoi > 0 ? "+" : ""}${stats.averageRoi}`} />
        </div>
        {(stats.totalSignals ?? 0) === 0 ? <p className="mt-4 text-sm text-text-muted">Completed TxLINE matches are loaded. Accuracy and ROI appear after SharpLine captures and resolves live signals.</p> : null}
      </section>
      <section className="rounded-2xl border border-border bg-surface p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Accuracy Trends</p>
        <h2 className="mt-3 font-display text-2xl font-semibold text-text">Historical Chart</h2>
        <div className="mt-6 h-[280px]">
          {(stats.correctSignals ?? 0) + (stats.incorrectSignals ?? 0) === 0 ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-border bg-bg/50 p-8 text-center">
              <p className="max-w-md text-sm leading-6 text-text-muted">Historical performance will populate automatically after completed matches.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accuracyData}>
                <CartesianGrid stroke="#22262B" vertical={false} />
                <XAxis dataKey="label" stroke="#8A9099" fontSize={11} tickLine={false} />
                <YAxis stroke="#8A9099" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#14171B", border: "1px solid #22262B", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="value" fill="#4D8DFF" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Strategy Performance</p>
        <div className="mt-5 space-y-3">
          {strategyData.map((item) => (
            <div key={item.strategy} className="flex items-center justify-between rounded-xl border border-border bg-bg/50 p-4">
              <div>
                <p className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${actionTone(item.strategy)}`}>{explainAction(item.strategy)}</p>
                <p className="mt-2 text-xs text-text-muted">Accuracy {item.accuracy ?? "Awaiting data"}% · ROI {item.averageRoi ?? "Awaiting data"}</p>
              </div>
              <p className="font-display text-2xl font-semibold text-text">{item.signals}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6 lg:col-span-2">
        <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Recent Resolved Signals</p>
        <div className="mt-5 space-y-3">
          {signals.length === 0 ? (
            <div className="rounded-xl border border-border bg-bg/50 p-6 text-sm text-text-muted">Historical performance will populate automatically after completed matches.</div>
          ) : signals.map((signal) => (
            <div key={`${signal.occurred_at}-${signal.market}-${signal.selection}`} className="grid gap-3 rounded-xl border border-border bg-bg/50 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div>
                <p className="font-display text-base text-text">{signal.match}</p>
                <p className="mt-1 text-sm text-text-muted">{formatMarketSelection(signal.market, signal.selection)}</p>
              </div>
              <p className="font-data text-xs text-text-muted">{new Date(signal.occurred_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              <p className="text-sm text-text">Confidence {signal.confidence}%</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-border bg-bg/50 p-4"><p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">{label}</p><p className="mt-2 font-display text-2xl font-semibold text-text">{value}</p></div>;
}
