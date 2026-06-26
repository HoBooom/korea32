import { describe, expect, it } from "vitest";
import { computeScenarios } from "./scenarios";
import type { Fixture, GroupLabel, TeamStanding, WorldCupData } from "./types";

const KOR = 17;
const GROUPS: GroupLabel[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

/** Build a finished group's standings from per-team [points, gd, gf]. Distinct points assumed. */
function group(
  label: GroupLabel,
  teams: Array<{ id: number; name: string; points: number; gd: number; gf: number }>,
): TeamStanding[] {
  return [...teams]
    .sort((a, b) => b.points - a.points)
    .map((t, i) => ({
      team: { id: t.id, name: t.name },
      group: label,
      rank: i + 1,
      played: 3,
      win: 0,
      draw: 0,
      loss: 0,
      goalsFor: t.gf,
      goalsAgainst: t.gf - t.gd,
      goalDiff: t.gd,
      points: t.points,
    }));
}

function emptyGroups(): Record<GroupLabel, TeamStanding[]> {
  const g = {} as Record<GroupLabel, TeamStanding[]>;
  for (const l of GROUPS) g[l] = [];
  return g;
}

describe("computeScenarios", () => {
  it("returns IN when Korea finishes top-2 with no remaining group match", () => {
    const groups = emptyGroups();
    groups.A = group("A", [
      { id: 1, name: "A1", points: 9, gd: 6, gf: 8 },
      { id: KOR, name: "Korea Republic", points: 6, gd: 2, gf: 5 },
      { id: 3, name: "A3", points: 3, gd: 0, gf: 3 },
      { id: 4, name: "A4", points: 0, gd: -8, gf: 1 },
    ]);
    const data: WorldCupData = { groups, fixtures: [], updatedAt: "" };
    const r = computeScenarios(data, KOR);
    expect(r.status).toBe("IN");
    expect(r.scenarioRatio).toBe(1);
  });

  it("returns OUT when Korea finishes last", () => {
    const groups = emptyGroups();
    groups.A = group("A", [
      { id: 1, name: "A1", points: 9, gd: 6, gf: 8 },
      { id: 2, name: "A2", points: 6, gd: 2, gf: 5 },
      { id: 3, name: "A3", points: 3, gd: 0, gf: 3 },
      { id: KOR, name: "Korea Republic", points: 0, gd: -8, gf: 1 },
    ]);
    const data: WorldCupData = { groups, fixtures: [], updatedAt: "" };
    const r = computeScenarios(data, KOR);
    expect(r.status).toBe("OUT");
    expect(r.scenarioRatio).toBe(0);
  });

  it("returns CONTENDS at the third-place cut line, decided by one match", () => {
    const groups = emptyGroups();
    // Korea is 3rd in A with 3 pts, gd 0.
    groups.A = group("A", [
      { id: 1, name: "A1", points: 9, gd: 6, gf: 8 },
      { id: 2, name: "A2", points: 6, gd: 2, gf: 5 },
      { id: KOR, name: "Korea Republic", points: 3, gd: 0, gf: 3 },
      { id: 4, name: "A4", points: 0, gd: -6, gf: 1 },
    ]);
    // 7 groups (B..H) whose 3rd-placed team (4 pts) is clearly above Korea.
    const above: GroupLabel[] = ["B", "C", "D", "E", "F", "G", "H"];
    above.forEach((l, i) => {
      const b = 100 + i * 10;
      groups[l] = group(l, [
        { id: b, name: `${l}1`, points: 9, gd: 6, gf: 8 },
        { id: b + 1, name: `${l}2`, points: 6, gd: 2, gf: 5 },
        { id: b + 2, name: `${l}3`, points: 4, gd: 1, gf: 4 },
        { id: b + 3, name: `${l}4`, points: 0, gd: -9, gf: 0 },
      ]);
    });
    // 3 groups (I..K) whose 3rd team (1 pt) is below Korea.
    const below: GroupLabel[] = ["I", "J", "K"];
    below.forEach((l, i) => {
      const b = 300 + i * 10;
      groups[l] = group(l, [
        { id: b, name: `${l}1`, points: 9, gd: 6, gf: 8 },
        { id: b + 1, name: `${l}2`, points: 4, gd: 1, gf: 4 },
        { id: b + 2, name: `${l}3`, points: 1, gd: -3, gf: 1 },
        { id: b + 3, name: `${l}4`, points: 0, gd: -4, gf: 0 },
      ]);
    });
    // Group L: 3rd-placed L3 currently 3 pts (gd 0) but worse than Korea on GD.
    // One remaining match L3 (home) vs L4 (away) decides Korea's fate.
    const L3 = 503, L4 = 504;
    groups.L = group("L", [
      { id: 501, name: "L1", points: 6, gd: 5, gf: 6 },
      { id: 502, name: "L2", points: 4, gd: 1, gf: 3 },
      { id: L3, name: "L3", points: 3, gd: 0, gf: 2 },
      { id: L4, name: "L4", points: 0, gd: -6, gf: 0 },
    ]);
    const remaining: Fixture = {
      id: 9001,
      group: "L",
      home: { id: L3, name: "L3" },
      away: { id: L4, name: "L4" },
      kickoff: "2026-06-27T18:00:00Z",
      phase: "scheduled",
      homeGoals: null,
      awayGoals: null,
    };
    const data: WorldCupData = { groups, fixtures: [remaining], updatedAt: "" };
    const r = computeScenarios(data, KOR);

    expect(r.status).toBe("CONTENDS");
    // Korea advances only when L4 (away) beats L3 — a strict subset of outcomes,
    // so the strength-weighted probability sits strictly between 0 and 1.
    expect(r.scenarioRatio).toBeGreaterThan(0);
    expect(r.scenarioRatio).toBeLessThan(1);
    const impact = r.matchImpacts.find((m) => m.fixtureId === 9001)!;
    expect(impact.favorable.away).toBe(true);
    expect(impact.favorable.home).toBe(false);
    expect(impact.favorable.draw).toBe(false);
  });
});
