import { parseGroupLabel } from "./standings";
import { koNameByCode } from "./teamNamesKo";
import type { Fixture, GroupLabel, TeamStanding, WorldCupData } from "./types";

// Adapter for the free, open-source worldcup26.ir API (no auth required).
// Provides live 2026 World Cup groups, fixtures and teams.
// Docs/source: https://github.com/rezarahiminia/worldcup2026

const BASE = process.env.WORLDCUP26_BASE ?? "https://worldcup26.ir";
const REVALIDATE = 30; // seconds — keeps live scores fresh within ~30s

interface RawTeam {
  id: string;
  name_en: string;
  flag?: string;
  fifa_code?: string;
  groups?: string;
}

interface RawGroupTeam {
  team_id: string;
  mp: string;
  w: string;
  l: string;
  d: string;
  pts: string;
  gf: string;
  ga: string;
  gd: string;
}

interface RawGroup {
  name: string;
  teams: RawGroupTeam[];
}

interface RawGame {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: string;
  away_score: string;
  group: string;
  matchday: string;
  local_date: string; // "MM/DD/YYYY HH:MM" (host local time)
  finished: string; // "TRUE" | "FALSE"
  time_elapsed: string; // "notstarted" | "live" | "finished" | "Finished"
  type: string; // "group" | "r16" | ...
  home_team_name_en?: string;
  away_team_name_en?: string;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate: REVALIDATE } });
  if (!res.ok) throw new Error(`worldcup26 ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

const num = (s: string | undefined): number => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Parse "MM/DD/YYYY HH:MM" host-local time into an ISO instant. The API exposes
 * no timezone, so we assume US Eastern (UTC-4, EDT) — the predominant 2026 host
 * offset. Times may be off by a few hours for Central/Mountain/Pacific venues.
 */
function toIso(localDate: string): string {
  const m = localDate?.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (!m) return new Date().toISOString();
  const [, mm, dd, yyyy, hh, min] = m;
  const utc = Date.UTC(+yyyy, +mm - 1, +dd, +hh + 4, +min);
  return new Date(utc).toISOString();
}

function phaseOf(g: RawGame): Fixture["phase"] {
  const t = g.time_elapsed?.toLowerCase();
  if (g.finished === "TRUE" || t === "finished") return "finished";
  if (t === "live") return "live";
  return "scheduled";
}

export interface Worldcup26Result {
  data: WorldCupData;
  koreaId: number;
}

export async function fetchWorldcup26(): Promise<Worldcup26Result> {
  const [groupsRes, gamesRes, teamsRes] = await Promise.all([
    get<{ groups: RawGroup[] }>("/get/groups"),
    get<{ games: RawGame[] }>("/get/games"),
    get<{ teams: RawTeam[] }>("/get/teams"),
  ]);

  const teams = teamsRes.teams ?? [];
  const nameById = new Map<number, string>();
  const flagById = new Map<number, string>();
  const codeById = new Map<number, string>();
  let koreaId = 0;
  for (const t of teams) {
    const id = num(t.id);
    // Display name in Korean (falls back to the English name).
    nameById.set(id, koNameByCode(t.fifa_code, t.name_en));
    if (t.flag) flagById.set(id, t.flag);
    if (t.fifa_code) codeById.set(id, t.fifa_code);
    if (t.fifa_code === "KOR" || /korea/i.test(t.name_en)) koreaId = id;
  }

  const teamRef = (id: number, fallback?: string) => ({
    id,
    name: nameById.get(id) ?? fallback ?? `Team ${id}`,
    logo: flagById.get(id),
    code: codeById.get(id),
  });

  // --- Standings ---
  const groups = {} as Record<GroupLabel, TeamStanding[]>;
  for (const g of groupsRes.groups ?? []) {
    const label = parseGroupLabel(g.name);
    if (!label) continue;
    const rows: TeamStanding[] = g.teams.map((row) => {
      const id = num(row.team_id);
      return {
        team: teamRef(id),
        group: label,
        rank: 0,
        played: num(row.mp),
        win: num(row.w),
        draw: num(row.d),
        loss: num(row.l),
        goalsFor: num(row.gf),
        goalsAgainst: num(row.ga),
        goalDiff: num(row.gd),
        points: num(row.pts),
      };
    });
    rows.sort(
      (a, b) =>
        b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor,
    );
    rows.forEach((r, i) => (r.rank = i + 1));
    groups[label] = rows;
  }

  // --- Fixtures (group stage only) ---
  const fixtures: Fixture[] = [];
  for (const g of gamesRes.games ?? []) {
    if (g.type !== "group") continue;
    const label = parseGroupLabel(g.group);
    if (!label) continue;
    const homeId = num(g.home_team_id);
    const awayId = num(g.away_team_id);
    if (!homeId || !awayId) continue;
    const phase = phaseOf(g);
    const played = phase !== "scheduled";
    fixtures.push({
      id: num(g.id),
      group: label,
      home: teamRef(homeId, g.home_team_name_en),
      away: teamRef(awayId, g.away_team_name_en),
      kickoff: toIso(g.local_date),
      matchday: num(g.matchday) || undefined,
      phase,
      homeGoals: played ? num(g.home_score) : null,
      awayGoals: played ? num(g.away_score) : null,
      statusShort: g.time_elapsed,
    });
  }

  return {
    data: { groups, fixtures, updatedAt: new Date().toISOString() },
    koreaId,
  };
}
