"use client";

import { Activity, Brain, Radio } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MatchMomentumTimelineData } from "../lib/queries";

export const MOMENTUM_TIMELINE_EMPTY_MESSAGE = "Momentum timeline will appear automatically once TxLINE sends live match events and Sharpline generates real match intelligence.";

export function MatchMomentumTimeline({ timeline }: { timeline: MatchMomentumTimelineData | null }) {
  if (!timeline || timeline.points.length < 2) return null;
  const markerByLabel = new Map(timeline.markers.map((marker) => [marker.label, marker]));

  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Match Momentum Timeline</p>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-0.03em] text-text">Real TxLINE-driven match intelligence</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">Rendered only from stored match insights, match events, and live signal rows. No demo or generated timeline points are used.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-signal-blue/20 bg-signal-blue/10 px-3 py-1.5 font-data text-[11px] uppercase text-signal-blue"><Activity className="h-3.5 w-3.5" /> {timeline.matchLabel}</span>
      </div>
      <div className="mt-6 h-[320px] rounded-2xl border border-border bg-bg/50 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={timeline.points} margin={{ top: 18, right: 24, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="rgba(148,163,184,0.14)" vertical={false} />
            <XAxis dataKey="label" stroke="#94A3B8" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis stroke="#94A3B8" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} domain={["dataMin - 5", "dataMax + 5"]} />
            <Tooltip contentStyle={{ background: "#111827", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 12 }} labelStyle={{ color: "#E5E7EB" }} />
            <Line type="monotone" dataKey="momentum" name="Momentum" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
            {timeline.markers.map((marker) => (
              <ReferenceDot key={marker.key} x={marker.label} y={marker.momentum} r={5} fill={marker.kind === "signal" ? "#22C55E" : "#F59E0B"} stroke="transparent" />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {timeline.points.filter((point) => markerByLabel.has(point.label)).slice(0, 6).map((point) => {
          const marker = markerByLabel.get(point.label)!;
          const Icon = marker.kind === "signal" ? Brain : Radio;
          return <div key={marker.key} className="rounded-xl border border-border bg-bg/50 p-4"><Icon className="h-4 w-4 text-signal-green" /><p className="mt-3 font-data text-xs text-text-muted">{marker.label}</p><p className="mt-1 text-sm font-medium text-text">{marker.title}</p></div>;
        })}
      </div>
    </section>
  );
}
