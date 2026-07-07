import { NETWORK_CONFIG } from "./config.js";
import { txlineSession } from "./client.js";

type SseMessage = { id?: string; event?: string; data: string; retry?: number };

function parseSseBlock(block: string): SseMessage | null {
  const message: SseMessage = { data: "" };

  for (const rawLine of block.split(/\r?\n/)) {
    if (!rawLine || rawLine.startsWith(":")) continue;

    const separatorIndex = rawLine.indexOf(":");
    const field = separatorIndex === -1 ? rawLine : rawLine.slice(0, separatorIndex);
    const value =
      separatorIndex === -1 ? "" : rawLine.slice(separatorIndex + 1).replace(/^ /, "");

    if (field === "data") message.data += `${value}\n`;
    if (field === "event") message.event = value;
    if (field === "id") message.id = value;
    if (field === "retry") message.retry = Number(value);
  }

  message.data = message.data.replace(/\n$/, "");
  return message.data || message.event || message.id ? message : null;
}

async function* readSseMessages(response: Response): AsyncGenerator<SseMessage> {
  if (!response.body) throw new Error("Stream response has no body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let separator = buffer.match(/\r?\n\r?\n/);
      while (separator?.index !== undefined) {
        const block = buffer.slice(0, separator.index);
        buffer = buffer.slice(separator.index + separator[0].length);

        const message = parseSseBlock(block);
        if (message) yield message;

        separator = buffer.match(/\r?\n\r?\n/);
      }
    }

    buffer += decoder.decode();
    const message = parseSseBlock(buffer);
    if (message) yield message;
  } finally {
    reader.releaseLock();
  }
}

function parseSseData(data: string) {
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

type StreamHandler = (event: string, data: any) => void;

async function connectStream(
  path: string,
  onEvent: StreamHandler,
  signal: AbortSignal
): Promise<void> {
  const streamUrl = `${NETWORK_CONFIG.apiOrigin}/api${path}`;

  const streamResponse = await fetch(streamUrl, {
    signal,
    headers: {
      Authorization: `Bearer ${txlineSession.jwt}`,
      "X-Api-Token": txlineSession.apiToken,
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });

  if (!streamResponse.ok) {
    throw new Error(`Stream failed [${path}]: ${streamResponse.status}`);
  }

  console.log(`[stream${path}] connected`);

  try {
    for await (const message of readSseMessages(streamResponse)) {
      onEvent(message.event ?? "message", parseSseData(message.data));
    }
  } catch (err: any) {
    if (signal.aborted) {
      console.log(`[stream${path}] disconnected (window ended)`);
      return;
    }
    throw err;
  }
}

export function connectOddsStream(
  onEvent: StreamHandler,
  signal: AbortSignal
): Promise<void> {
  return connectStream("/odds/stream", onEvent, signal);
}

export function connectScoresStream(
  onEvent: StreamHandler,
  signal: AbortSignal
): Promise<void> {
  return connectStream("/scores/stream", onEvent, signal);
}