import { kstDateKey } from "./format";
import type { Fixture, GroupLabel, TeamStanding, WorldCupData } from "./types";

// A plausible final-matchday snapshot used when no APISPORTS_KEY is configured,
// so the app is fully explorable in local dev. Korea (id 17) sits 3rd in Group E
// and is on the third-place bubble with matches still to play.

export const MOCK_KOREA_ID = 17;

interface Seed {
  id: number;
  name: string;
  points: number;
  gd: number;
  gf: number;
  played: number;
}

function buildGroup(label: GroupLabel, seeds: Seed[]): TeamStanding[] {
  return [...seeds]
    .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf)
    .map((s, i) => ({
      team: { id: s.id, name: s.name },
      group: label,
      rank: i + 1,
      played: s.played,
      win: 0,
      draw: 0,
      loss: 0,
      goalsFor: s.gf,
      goalsAgainst: s.gf - s.gd,
      goalDiff: s.gd,
      points: s.points,
    }));
}

/** YYYY-MM-DD plus n days. */
function addDays(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

const groupSeeds: Record<GroupLabel, Seed[]> = {
  A: [
    { id: 1, name: "Mexico", points: 7, gd: 4, gf: 6, played: 3 },
    { id: 2, name: "Croatia", points: 5, gd: 1, gf: 4, played: 3 },
    { id: 3, name: "Norway", points: 4, gd: 0, gf: 3, played: 3 },
    { id: 4, name: "Saudi Arabia", points: 0, gd: -5, gf: 1, played: 3 },
  ],
  B: [
    { id: 11, name: "Canada", points: 6, gd: 3, gf: 5, played: 3 },
    { id: 12, name: "Belgium", points: 6, gd: 2, gf: 5, played: 3 },
    { id: 13, name: "Egypt", points: 4, gd: 1, gf: 3, played: 3 },
    { id: 14, name: "Qatar", points: 0, gd: -6, gf: 1, played: 3 },
  ],
  C: [
    { id: 21, name: "Spain", points: 9, gd: 7, gf: 9, played: 3 },
    { id: 22, name: "Uruguay", points: 4, gd: 1, gf: 4, played: 3 },
    { id: 23, name: "Ghana", points: 4, gd: 0, gf: 3, played: 3 },
    { id: 24, name: "New Zealand", points: 0, gd: -8, gf: 1, played: 3 },
  ],
  D: [
    { id: 31, name: "France", points: 7, gd: 5, gf: 7, played: 3 },
    { id: 32, name: "Senegal", points: 5, gd: 2, gf: 4, played: 3 },
    { id: 33, name: "Poland", points: 3, gd: -1, gf: 3, played: 3 },
    { id: 34, name: "Jordan", points: 1, gd: -6, gf: 1, played: 3 },
  ],
  // --- Korea's group: still one match to play (today). Korea 3rd. ---
  E: [
    { id: 41, name: "Portugal", points: 6, gd: 4, gf: 6, played: 2 },
    { id: 42, name: "Switzerland", points: 4, gd: 1, gf: 3, played: 2 },
    { id: MOCK_KOREA_ID, name: "Korea Republic", points: 3, gd: 0, gf: 3, played: 2 },
    { id: 44, name: "Ivory Coast", points: 1, gd: -5, gf: 1, played: 2 },
  ],
  F: [
    { id: 51, name: "Argentina", points: 7, gd: 5, gf: 6, played: 3 },
    { id: 52, name: "Australia", points: 4, gd: 0, gf: 3, played: 3 },
    { id: 53, name: "Nigeria", points: 4, gd: -1, gf: 3, played: 3 },
    { id: 54, name: "Panama", points: 2, gd: -4, gf: 2, played: 3 },
  ],
  G: [
    { id: 61, name: "England", points: 9, gd: 6, gf: 8, played: 3 },
    { id: 62, name: "Colombia", points: 4, gd: 1, gf: 4, played: 3 },
    { id: 63, name: "Japan", points: 4, gd: 0, gf: 3, played: 3 },
    { id: 64, name: "Tunisia", points: 0, gd: -7, gf: 1, played: 3 },
  ],
  H: [
    { id: 71, name: "Netherlands", points: 7, gd: 4, gf: 6, played: 3 },
    { id: 72, name: "Ecuador", points: 5, gd: 2, gf: 4, played: 3 },
    { id: 73, name: "Austria", points: 3, gd: -1, gf: 3, played: 3 },
    { id: 74, name: "South Africa", points: 1, gd: -5, gf: 1, played: 3 },
  ],
  // --- Group with a match today that affects Korea's third-place race. ---
  I: [
    { id: 81, name: "Germany", points: 6, gd: 3, gf: 5, played: 2 },
    { id: 82, name: "Denmark", points: 4, gd: 2, gf: 4, played: 2 },
    { id: 83, name: "Morocco", points: 3, gd: 0, gf: 2, played: 2 },
    { id: 84, name: "Costa Rica", points: 1, gd: -5, gf: 1, played: 2 },
  ],
  J: [
    { id: 91, name: "Brazil", points: 7, gd: 5, gf: 7, played: 3 },
    { id: 92, name: "Serbia", points: 4, gd: 0, gf: 3, played: 3 },
    { id: 93, name: "Cameroon", points: 2, gd: -1, gf: 2, played: 3 },
    { id: 94, name: "Uzbekistan", points: 2, gd: -4, gf: 1, played: 3 },
  ],
  K: [
    { id: 101, name: "Italy", points: 9, gd: 6, gf: 8, played: 3 },
    { id: 102, name: "USA", points: 6, gd: 2, gf: 5, played: 3 },
    { id: 103, name: "Algeria", points: 1, gd: -3, gf: 2, played: 3 },
    { id: 104, name: "Wales", points: 1, gd: -5, gf: 1, played: 3 },
  ],
  L: [
    { id: 111, name: "Germany B", points: 7, gd: 4, gf: 6, played: 3 },
    { id: 112, name: "Sweden", points: 5, gd: 2, gf: 4, played: 3 },
    { id: 113, name: "Paraguay", points: 3, gd: -1, gf: 3, played: 3 },
    { id: 114, name: "Iran", points: 1, gd: -5, gf: 1, played: 3 },
  ],
};

function fixture(
  id: number,
  group: GroupLabel,
  home: TeamStanding,
  away: TeamStanding,
  date: string,
  phase: Fixture["phase"] = "scheduled",
  homeGoals: number | null = null,
  awayGoals: number | null = null,
): Fixture {
  return {
    id,
    group,
    home: home.team,
    away: away.team,
    // 03:00 UTC == 12:00 KST, so the KST calendar day matches `date`.
    kickoff: `${date}T03:00:00Z`,
    phase,
    homeGoals,
    awayGoals,
    statusShort: phase === "finished" ? "FT" : phase === "live" ? "1H" : "NS",
  };
}

export function buildMockData(updatedAt: string): WorldCupData {
  const groups = {} as Record<GroupLabel, TeamStanding[]>;
  (Object.keys(groupSeeds) as GroupLabel[]).forEach((l) => {
    groups[l] = buildGroup(l, groupSeeds[l]);
  });

  const byRank = (l: GroupLabel, r: number) => groups[l].find((s) => s.rank === r)!;

  const today = kstDateKey(updatedAt);
  const tomorrow = addDays(today, 1);

  const fixtures: Fixture[] = [
    // Korea's final group match — TODAY, live.
    fixture(9001, "E", byRank("E", 3), byRank("E", 2), today, "live", 1, 1),
    fixture(9002, "E", byRank("E", 1), byRank("E", 4), today, "live", 2, 0),
    // Group I final matches — TODAY, affect the third-place race.
    fixture(9101, "I", byRank("I", 3), byRank("I", 4), today, "scheduled"),
    fixture(9102, "I", byRank("I", 1), byRank("I", 2), today, "scheduled"),
    // A couple of future matches — TOMORROW.
    fixture(9201, "A", byRank("A", 2), byRank("A", 3), tomorrow, "scheduled"),
  ];

  return { groups, fixtures, updatedAt };
}
