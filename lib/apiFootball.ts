import {
  buildWorldCupData,
  type RawFixturesResponse,
  type RawStandingsResponse,
} from "./standings";
import type { WorldCupData } from "./types";

// API-Football (api-sports.io) adapter. NOTE: the free tier does NOT include the
// 2026 season, so this is an optional alternative source. worldcup26 is default.

const BASE = "https://v3.football.api-sports.io";
const LEAGUE_ID = Number(process.env.WORLDCUP_LEAGUE_ID ?? 1);
const SEASON = Number(process.env.WORLDCUP_SEASON ?? 2026);
const REVALIDATE = 60;

/** True when an API-Football key is configured. */
export function hasApiKey(): boolean {
  return Boolean(process.env.APISPORTS_KEY);
}

async function apiGet<T>(path: string): Promise<T> {
  const key = process.env.APISPORTS_KEY!;
  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-apisports-key": key },
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) {
    throw new Error(`API-Football ${path} failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

/** Pull the human-readable error API-Football returns in `errors`. */
export function extractApiError(raw: unknown): string | undefined {
  const errors = (raw as { errors?: unknown })?.errors;
  if (!errors) return undefined;
  if (Array.isArray(errors)) return errors.length ? String(errors[0]) : undefined;
  if (typeof errors === "object") {
    const vals = Object.values(errors as Record<string, unknown>);
    return vals.length ? String(vals[0]) : undefined;
  }
  return String(errors);
}

/** Fetch and normalize World Cup data from API-Football. Throws if empty. */
export async function fetchApiFootball(): Promise<WorldCupData> {
  const now = new Date().toISOString();
  const q = `league=${LEAGUE_ID}&season=${SEASON}`;
  const [standings, fixtures] = await Promise.all([
    apiGet<RawStandingsResponse>(`/standings?${q}`),
    apiGet<RawFixturesResponse>(`/fixtures?${q}`),
  ]);
  const data = buildWorldCupData(standings, fixtures, now);
  const hasTeams = Object.values(data.groups).some((g) => g.length > 0);
  if (!hasTeams) {
    throw new Error(
      extractApiError(standings) ?? `API-Football: season=${SEASON} 데이터가 비어 있습니다.`,
    );
  }
  return data;
}
