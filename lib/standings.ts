import type {
  Fixture,
  GroupLabel,
  MatchPhase,
  TeamStanding,
  ThirdPlaceEntry,
  WorldCupData,
} from "./types";

// --- Minimal shapes of the API-Football v3 responses we consume. ---

interface RawStandingRow {
  rank: number;
  team: { id: number; name: string; logo?: string };
  points: number;
  goalsDiff: number;
  group: string; // e.g. "Group A"
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
}

export interface RawStandingsResponse {
  response: Array<{
    league: {
      id: number;
      season: number;
      standings: RawStandingRow[][]; // one inner array per group
    };
  }>;
}

interface RawFixture {
  fixture: {
    id: number;
    date: string;
    status: { short: string; long?: string };
  };
  league?: { round?: string };
  teams: {
    home: { id: number; name: string; logo?: string };
    away: { id: number; name: string; logo?: string };
  };
  goals: { home: number | null; away: number | null };
}

export interface RawFixturesResponse {
  response: RawFixture[];
}

const GROUP_LABELS: readonly GroupLabel[] = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
];

/** "Group A" | "A" -> "A"; returns null if not a recognized group. */
export function parseGroupLabel(raw: string | undefined): GroupLabel | null {
  if (!raw) return null;
  const m = raw.match(/group\s*([A-L])/i) ?? raw.match(/\b([A-L])\b/);
  const letter = m?.[1]?.toUpperCase();
  return (GROUP_LABELS as readonly string[]).includes(letter ?? "")
    ? (letter as GroupLabel)
    : null;
}

const LIVE_CODES = new Set([
  "1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT",
]);
const FINISHED_CODES = new Set(["FT", "AET", "PEN"]);

export function phaseFromStatus(short: string): MatchPhase {
  if (FINISHED_CODES.has(short)) return "finished";
  if (LIVE_CODES.has(short)) return "live";
  return "scheduled";
}

export function normalizeStandings(
  raw: RawStandingsResponse,
): { groups: Record<GroupLabel, TeamStanding[]>; teamGroup: Map<number, GroupLabel> } {
  const groups = {} as Record<GroupLabel, TeamStanding[]>;
  const teamGroup = new Map<number, GroupLabel>();

  const league = raw.response?.[0]?.league;
  for (const groupRows of league?.standings ?? []) {
    for (const row of groupRows) {
      const label = parseGroupLabel(row.group);
      if (!label) continue;
      const standing: TeamStanding = {
        team: { id: row.team.id, name: row.team.name, logo: row.team.logo },
        group: label,
        rank: row.rank,
        played: row.all.played,
        win: row.all.win,
        draw: row.all.draw,
        loss: row.all.lose,
        goalsFor: row.all.goals.for,
        goalsAgainst: row.all.goals.against,
        goalDiff: row.goalsDiff,
        points: row.points,
      };
      (groups[label] ??= []).push(standing);
      teamGroup.set(row.team.id, label);
    }
  }

  for (const label of GROUP_LABELS) {
    groups[label]?.sort((a, b) => a.rank - b.rank);
  }

  return { groups, teamGroup };
}

export function normalizeFixtures(
  raw: RawFixturesResponse,
  teamGroup: Map<number, GroupLabel>,
): Fixture[] {
  const fixtures: Fixture[] = [];
  for (const f of raw.response ?? []) {
    // Group is most reliably derived from the teams' group membership;
    // fall back to the round string.
    const group =
      teamGroup.get(f.teams.home.id) ??
      teamGroup.get(f.teams.away.id) ??
      parseGroupLabel(f.league?.round);
    if (!group) continue; // skip knockout / unknown fixtures
    fixtures.push({
      id: f.fixture.id,
      group,
      home: { id: f.teams.home.id, name: f.teams.home.name, logo: f.teams.home.logo },
      away: { id: f.teams.away.id, name: f.teams.away.name, logo: f.teams.away.logo },
      kickoff: f.fixture.date,
      phase: phaseFromStatus(f.fixture.status.short),
      homeGoals: f.goals.home,
      awayGoals: f.goals.away,
      statusShort: f.fixture.status.short,
    });
  }
  return fixtures;
}

export function buildWorldCupData(
  rawStandings: RawStandingsResponse,
  rawFixtures: RawFixturesResponse,
  updatedAt: string,
): WorldCupData {
  const { groups, teamGroup } = normalizeStandings(rawStandings);
  const fixtures = normalizeFixtures(rawFixtures, teamGroup);
  return { groups, fixtures, updatedAt };
}

/** The third-placed team of each group, as cross-group ranking entries. */
export function thirdPlaceEntries(
  groups: Record<GroupLabel, TeamStanding[]>,
): ThirdPlaceEntry[] {
  const entries: ThirdPlaceEntry[] = [];
  for (const label of GROUP_LABELS) {
    const third = groups[label]?.find((s) => s.rank === 3);
    if (!third) continue;
    entries.push({
      team: third.team,
      group: label,
      points: third.points,
      goalDiff: third.goalDiff,
      goalsFor: third.goalsFor,
      disciplinaryPoints: third.disciplinaryPoints,
    });
  }
  return entries;
}

export { GROUP_LABELS };
