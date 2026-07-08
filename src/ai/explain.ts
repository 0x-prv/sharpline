import type { MarketSignal } from "../types.js";

function fallback(signal: Omit<MarketSignal, "explanation" | "aiProvider">): string {
  const history = signal.historicalComparison
    ? ` Historical baseline: ${signal.historicalComparison.similarSignals} similar resolved signal(s), success rate ${signal.historicalComparison.historicalSuccessRate ?? "n/a"}%, avg ROI ${signal.historicalComparison.averageRoi ?? "n/a"}.`
    : "";
  return `${signal.action}: ${signal.reasonCode} on ${signal.match}. ${signal.market}/${signal.selection} moved ${signal.direction} from ${signal.previousOdds.toFixed(2)} to ${signal.currentOdds.toFixed(2)} (${signal.movementPct.toFixed(1)}%). Severity=${signal.severity}, confidence=${signal.confidence}%. Current match state ${signal.currentMatchState}; pending automatic resolution.${history}`;
}

export function fallbackExplanation(signal: Omit<MarketSignal, "explanation" | "aiProvider">): string {
  return fallback(signal);
}

export async function explainSignal(signal: Omit<MarketSignal, "explanation" | "aiProvider">): Promise<Pick<MarketSignal, "explanation" | "aiProvider">> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { explanation: fallback(signal), aiProvider: "fallback" };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(process.env.GROQ_TIMEOUT_MS ?? 8000));
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.GROQ_MODEL ?? "llama-3.1-8b-instant",
        temperature: 0.2,
        messages: [
          { role: "system", content: "Explain FIFA World Cup match intelligence signals powered by TxLINE scores and odds. Do not choose actions; the deterministic engine already chose the action. Use supplied historical statistics as context, never invent data, stay concise, and never imply betting advice." },
          { role: "user", content: JSON.stringify(signal) },
        ],
      }),
    }).finally(() => clearTimeout(timeout));
    if (!response.ok) throw new Error(`Groq returned ${response.status}`);
    const json: any = await response.json();
    return { explanation: json.choices?.[0]?.message?.content?.trim() || fallback(signal), aiProvider: "groq" };
  } catch (err: any) {
    console.error(JSON.stringify({ level: "warn", component: "ai", message: "groq_failed_using_fallback", error: err.message }));
    return { explanation: fallback(signal), aiProvider: "fallback" };
  }
}
