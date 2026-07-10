import axios from "axios";
import { NETWORK_CONFIG } from "./config.js";
import { getTxlineSession, isAuthFailure, recoverTxlineSession } from "./session.js";

const api = axios.create({ timeout: 30000, baseURL: NETWORK_CONFIG.apiOrigin, headers: { "Content-Type": "application/json" } });

api.interceptors.request.use((config) => {
  const session = getTxlineSession();
  config.headers.Authorization = `Bearer ${session.jwt}`;
  config.headers["X-Api-Token"] = session.apiToken;
  return config;
});

api.interceptors.response.use(undefined, async (error) => {
  const config = error.config ?? {};
  if (!isAuthFailure(error) || config.__txlineRetried) throw error;
  config.__txlineRetried = true;
  const recovered = await recoverTxlineSession();
  if (!recovered) throw error;
  config.headers.Authorization = `Bearer ${recovered.jwt}`;
  config.headers["X-Api-Token"] = recovered.apiToken;
  return api.request(config);
});

export async function getFixturesSnapshot(competitionId?: number) {
  const res = await api.get("/api/fixtures/snapshot", { params: competitionId ? { competitionId } : undefined });
  const fixtureCount = Array.isArray(res.data) ? res.data.length : null;
  console.log(JSON.stringify({ level: "info", component: "txline", event: "fixtures_snapshot_returned", competitionId: competitionId ?? null, count: fixtureCount }));
  return res.data;
}

export async function getOddsSnapshot(fixtureId: string | number) {
  const res = await api.get(`/api/odds/snapshot/${fixtureId}`);
  return res.data;
}

export async function getScoreUpdates(fixtureId: string | number) {
  const res = await api.get(`/api/scores/updates/${fixtureId}`);
  return res.data;
}
