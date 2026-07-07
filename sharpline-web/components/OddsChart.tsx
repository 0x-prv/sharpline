"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type Tick = {
  price: number;
  received_at: string;
  selection: string;
  market: string;
};

export function OddsChart({ ticks }: { ticks: Tick[] }) {
  if (ticks.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-xl border border-border bg-surface">
        <p className="text-sm text-text-muted">No odds history yet.</p>
      </div>
    );
  }

  const chartData = ticks.map((t) => ({
    time: new Date(t.received_at).toLocaleTimeString("en-US", {
      hour12: false,
      minute: "2-digit",
      hour: "2-digit",
    }),
    price: t.price,
  }));

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="font-data text-xs text-text-muted">
  Live odds movement · {ticks[0]?.market} · {ticks[0]?.selection}
</p>
      <div className="mt-3 h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis
              dataKey="time"
              stroke="#8A9099"
              fontSize={11}
              tickLine={false}
            />
        <YAxis
  stroke="#8A9099"
  fontSize={11}
  tickLine={false}
  domain={[
    (dataMin: number) => dataMin - 0.2,
    (dataMax: number) => dataMax + 0.2,
  ]}
  tickFormatter={(value: number) => value.toFixed(1)}
/>
            <Tooltip
              contentStyle={{
                background: "#14171B",
                border: "1px solid #22262B",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#37D67A"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}