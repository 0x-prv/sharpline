"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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

type SignalAccuracy = {
  totalSignals: number;
  resolvedSignals: number;
  correctSignals: number;
  overallAccuracy: number | null;
  byAction: Array<{ action: "ALERT" | "FADE" | "FOLLOW" | "WATCH"; total: number; correct: number; accuracy: number | null }>;
  cumulative: Array<{ label: string; resolvedAt: string; accuracy: number; correct: number; total: number }>;
};

type Signal = {
  match: string;
  market: string;
  selection: string;
  action: string;
  confidence: number;
  occurred_at: string;
};

export function AnalyticsPanel({ stats, signals, signalAccuracy }: { stats: Stats; signals: Signal[]; signalAccuracy: SignalAccuracy }) {
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
      <SignalAccuracyPanel signalAccuracy={signalAccuracy} />

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


function SignalAccuracyPanel({ signalAccuracy }: { signalAccuracy: SignalAccuracy }) {
  const hasResolutions = signalAccuracy.resolvedSignals > 0;

  return (
    <section className="rounded-2xl border border-border bg-surface p-6 lg:col-span-2">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Signal Accuracy</p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-text">Live Resolution Performance</h2>
        </div>
        <div className="rounded-xl border border-border bg-bg/50 px-4 py-3 text-left md:text-right">
          <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Sample Size</p>
          <p className="mt-1 font-display text-xl font-semibold text-text">{signalAccuracy.resolvedSignals} / {signalAccuracy.totalSignals}</p>
          <p className="mt-1 text-xs text-text-muted">resolved vs generated</p>
        </div>
      </div>

      {!hasResolutions ? (
        <div className="mt-6 flex min-h-[260px] items-center justify-center rounded-xl border border-border bg-bg/50 p-8 text-center">
          <div>
            <p className="font-display text-xl font-semibold text-text">No resolutions yet</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-text-muted">Signal accuracy will appear after live, non-demo signals are resolved. No placeholder numbers are shown.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
            <Metric label="Overall Accuracy" value={signalAccuracy.overallAccuracy === null ? "No resolutions yet" : `${signalAccuracy.overallAccuracy}%`} />
            <Metric label="Correct" value={signalAccuracy.correctSignals} />
            {signalAccuracy.byAction.map((item) => (
              <Metric key={item.action} label={item.action} value={item.accuracy === null ? "—" : `${item.accuracy}%`} />
            ))}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[0.72fr_1.28fr]">
            <div className="space-y-3">
              {signalAccuracy.byAction.map((item) => (
                <div key={item.action} className="rounded-xl border border-border bg-bg/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${actionTone(item.action)}`}>{explainAction(item.action)}</p>
                    <p className="font-display text-2xl font-semibold text-text">{item.accuracy === null ? "—" : `${item.accuracy}%`}</p>
                  </div>
                  <p className="mt-2 text-xs text-text-muted">{item.correct} correct / {item.total} resolved</p>
                </div>
              ))}
            </div>

            <div className="h-[320px] rounded-xl border border-border bg-bg/50 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={signalAccuracy.cumulative} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="signalAccuracyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4D8DFF" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#4D8DFF" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#22262B" strokeDasharray="3 8" vertical={false} />
                  <XAxis dataKey="label" stroke="#8A9099" fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis stroke="#8A9099" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                  <Tooltip contentStyle={{ background: "#14171B", border: "1px solid #22262B", borderRadius: 12, fontSize: 12 }} formatter={(value, name, props) => [`${value}% (${props.payload.correct}/${props.payload.total})`, "Accuracy"]} labelFormatter={(label) => `Resolved ${label}`} />
                  <Area type="monotone" dataKey="accuracy" stroke="#4D8DFF" strokeWidth={3} fill="url(#signalAccuracyGradient)" dot={false} activeDot={{ r: 4, fill: "#4D8DFF", stroke: "#D9E7FF", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
