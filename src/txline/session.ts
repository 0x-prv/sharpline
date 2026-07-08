import { readFile } from "fs/promises";
import axios from "axios";
import { activateApiToken, getGuestJwt, subscribeFreeWorldCupTier } from "./auth.js";
import { NETWORK_CONFIG } from "./config.js";

export interface TxlineSession {
  jwt: string;
  apiToken: string;
}

let session: TxlineSession | null = null;
const sessionPath = process.env.TXLINE_SESSION_PATH ?? "./.txline-session.json";

function isSession(value: unknown): value is TxlineSession {
  const candidate = value as Partial<TxlineSession> | null;
  return Boolean(candidate && typeof candidate.jwt === "string" && candidate.jwt.trim() && typeof candidate.apiToken === "string" && candidate.apiToken.trim());
}

export function getTxlineSession(): TxlineSession {
  if (!session) throw new Error("TxLINE session is not loaded. Run `npm run activate` to create .txline-session.json, then restart the worker.");
  return session;
}

export async function loadTxlineSession(): Promise<TxlineSession> {
  try {
    const raw = await readFile(sessionPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (!isSession(parsed)) throw new Error("session file must contain non-empty jwt and apiToken fields");
    session = parsed;
    return parsed;
  } catch (err: any) {
    const reason = err?.code === "ENOENT" ? `missing ${sessionPath}` : err?.message ?? String(err);
    throw new Error(`TxLINE session unavailable: ${reason}. Run \`npm run activate\` to create a valid session file.`);
  }
}

export async function validateTxlineSession(candidate: TxlineSession = getTxlineSession()): Promise<boolean> {
  try {
    const res = await axios.get(`${NETWORK_CONFIG.apiOrigin}/api/fixtures/snapshot`, {
      timeout: 15000,
      headers: { Authorization: `Bearer ${candidate.jwt}`, "X-Api-Token": candidate.apiToken },
      params: { competitionId: 72 },
    });
    return res.status >= 200 && res.status < 300;
  } catch (err: any) {
    if (err?.response?.status === 401 || err?.response?.status === 403) return false;
    throw err;
  }
}

export async function recoverTxlineSession(): Promise<TxlineSession | null> {
  if (process.env.TXLINE_AUTO_REACTIVATE !== "true") return null;
  try {
    const jwt = await getGuestJwt();
    const txSig = await subscribeFreeWorldCupTier();
    const apiToken = await activateApiToken(txSig, jwt, [72]);
    session = { jwt, apiToken };
    return session;
  } catch (err: any) {
    console.error(JSON.stringify({ level: "error", component: "txline", event: "session_recovery_failed", message: err?.message ?? String(err) }));
    return null;
  }
}

export async function ensureTxlineSessionReady(): Promise<TxlineSession> {
  const loaded = await loadTxlineSession();
  if (await validateTxlineSession(loaded)) return loaded;
  const recovered = await recoverTxlineSession();
  if (recovered && await validateTxlineSession(recovered)) return recovered;
  throw new Error("TxLINE session rejected with 401/403. Run `npm run activate` to refresh .txline-session.json, or set TXLINE_AUTO_REACTIVATE=true if on-chain reactivation is intended.");
}

export function isAuthFailure(err: any) {
  const status = err?.response?.status ?? err?.status;
  return status === 401 || status === 403;
}
