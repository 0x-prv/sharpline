"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "lucide-react";
import { SafeMarkdown } from "./SafeMarkdown";

export type AgentReasoningLogEntry = {
  id: string;
  action: string;
  confidence: number | null;
  reason_code: string | null;
  explanation: string | null;
  occurred_at: string | null;
};

function actionClass(action: string) {
  switch (action.toUpperCase()) {
    case "ALERT":
      return "text-signal-coral";
    case "FADE":
      return "text-amber-300";
    case "FOLLOW":
      return "text-emerald-300";
    case "WATCH":
      return "text-signal-blue";
    default:
      return "text-white";
  }
}

function formatTimestamp(value: string | null) {
  if (!value) return "00:00:00";
  return new Date(value).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  });
}

export function AgentReasoningLog({ entries, groqLive }: { entries: AgentReasoningLogEntry[]; groqLive: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [entries]);

  const visibleEntries = entries.filter((entry) => entry.explanation?.trim());

  return (
    <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-emerald-300" aria-hidden="true" />
            <h2 className="font-display text-xl font-bold text-text">Agent Reasoning Log</h2>
          </div>
          <p className="mt-2 text-sm text-text-muted">Real-time explanations behind every signal SharpLine generates.</p>
        </div>
        <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${groqLive ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-amber-300/40 bg-amber-300/10 text-amber-200"}`}>
          {groqLive ? "Groq Live" : "Fallback Mode"}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="mt-4 max-h-72 overflow-y-auto rounded-lg border border-emerald-400/20 bg-black p-4 font-mono text-sm leading-6 text-white shadow-inner"
        aria-live="polite"
      >
        {visibleEntries.length === 0 ? (
          <div className="flex min-h-36 items-center justify-center px-4 text-center text-sm text-zinc-300">
            No agent activity yet — logs will appear as signals are generated.
          </div>
        ) : (
          <div className="space-y-1">
            {visibleEntries.map((entry) => {
              const action = (entry.action || "WATCH").toUpperCase();
              const confidence = Math.round(Number(entry.confidence ?? 0));
              return (
                <div key={entry.id} className="whitespace-pre-wrap break-words text-emerald-200">
                  <span className="text-zinc-400">[{formatTimestamp(entry.occurred_at)}] </span>
                  <span className={actionClass(action)}>[{action}]</span>{" "}
                  <span className="text-white">{entry.reason_code ?? "UNKNOWN"}</span>{" "}
                  <span className="text-zinc-500">—</span>{" "}
                  <span className="font-bold text-emerald-300">{confidence}%</span>{" "}
                  <span className="text-zinc-500">—</span>{" "}
                  <SafeMarkdown className="inline text-zinc-100 [&>p]:inline [&>ul]:mt-1 [&>ul]:text-zinc-100">{entry.explanation}</SafeMarkdown>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
