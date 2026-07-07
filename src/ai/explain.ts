import type { MarketSignal } from "../types.js";

function fallback(signal: Omit<MarketSignal, "explanation" | "aiProvider">): string {
  return `${signal.action}: ${signal.reasonCode} on ${signal.match}. ${signal.market}/${signal.selection} moved ${signal.direction} from ${signal.previousOdds.toFixed(2)} to ${signal.currentOdds.toFixed(2)} (${signal.movementPct.toFixed(1)}%). Severity=${signal.severity}, confidence=${signal.confidence}%.`;
}

export async function explainSignal(signal: Omit<MarketSignal, "explanation" | "aiProvider">): Promise<Pick<MarketSignal, "explanation" | "aiProvider">> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { explanation: fallback(signal), aiProvider: "fallback" };

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL ?? "llama-3.1-8b-instant",
        temperature: 0.2,
        messages: [
          { role: "system", content: "Explain sports market signals for a trading desk. Do not choose actions; the deterministic engine already chose the action. Be concise and never imply betting advice." },
          { role: "user", content: JSON.stringify(signal) },
        ],
      }),
    });
    if (!response.ok) throw new Error(`Groq returned ${response.status}`);
    const json: any = await response.json();
    return { explanation: json.choices?.[0]?.message?.content?.trim() || fallback(signal), aiProvider: "groq" };
  } catch (err: any) {
    console.error(JSON.stringify({ level: "warn", component: "ai", message: "groq_failed_using_fallback", error: err.message }));
    return { explanation: fallback(signal), aiProvider: "fallback" };
  }
}
