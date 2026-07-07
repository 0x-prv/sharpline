import axios from "axios";
import { readFileSync } from "fs";
import { API_BASE_URL, NETWORK_CONFIG } from "./config.js";

interface Session {
  jwt: string;
  apiToken: string;
}

function loadSession(): Session {
  const raw = readFileSync("./.txline-session.json", "utf-8");
  return JSON.parse(raw);
}

export const txlineSession = loadSession();

const api = axios.create({
  timeout: 30000,
  baseURL: NETWORK_CONFIG.apiOrigin,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${txlineSession.jwt}`,
    "X-Api-Token": txlineSession.apiToken,
  },
});

export async function getFixturesSnapshot(competitionId?: number) {
  const res = await api.get("/api/fixtures/snapshot", {
    params: competitionId ? { competitionId } : undefined,
  });
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