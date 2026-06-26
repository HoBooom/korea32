import { fifaRankOf } from "./fifaRanking";
import { computeScenarios } from "./scenarios";
import { GROUP_LABELS } from "./standings";
import type { Fixture, GroupLabel, TeamStanding, WorldCupData } from "./types";

// For FINISHED matches we judge impact AS OF THE MOMENT THE MATCH KICKED OFF:
// reconstruct the standings from only the matches that had finished earlier,
// treat everything from this match onward as still open, then ask whether the
// actual result raised or lowered Korea's qualifying chances versus the
// alternatives that were live at kickoff.
//   good    -> the result helped Korea       (O, green)
//   bad     -> the result hurt Korea          (X, red)
//   neutral -> no bearing on Korea            (gray)

export type FinishedResult = "good" | "bad" | "neutral";

export interface FinishedImpact {
  result: FinishedResult;
  note: string;
}

const EPS = 0.02; // 2%p — ignore noise from sampling
const SAMPLE = 15_000; // lighter sampling; we only need a good/bad/neutral call

interface Acc {
  points: number;
  gf: number;
  ga: number;
  win: number;
  draw: number;
  loss: number;
  played: number;
}

/** Standings built from only the matches that finished strictly before `beforeMs`. */
function standingsAsOf(data: WorldCupData, beforeMs: number): Record<GroupLabel, TeamStanding[]> {
  const meta = new Map<number, { team: TeamStanding["team"]; group: GroupLabel }>();
  for (const label of GROUP_LABELS) {
    for (const s of data.groups[label] ?? []) meta.set(s.team.id, { team: s.team, group: label });
  }

  const acc = new Map<number, Acc>();
  const blank = (): Acc => ({ points: 0, gf: 0, ga: 0, win: 0, draw: 0, loss: 0, played: 0 });
  for (const id of meta.keys()) acc.set(id, blank());

  for (const f of data.fixtures) {
    if (f.phase !== "finished" || f.homeGoals == null || f.awayGoals == null) continue;
    if (Date.parse(f.kickoff) >= beforeMs) continue;
    const h = acc.get(f.home.id), a = acc.get(f.away.id);
    if (!h || !a) continue;
    h.played++; a.played++;
    h.gf += f.homeGoals; h.ga += f.awayGoals;
    a.gf += f.awayGoals; a.ga += f.homeGoals;
    if (f.homeGoals > f.awayGoals) { h.points += 3; h.win++; a.loss++; }
    else if (f.homeGoals < f.awayGoals) { a.points += 3; a.win++; h.loss++; }
    else { h.points++; a.points++; h.draw++; a.draw++; }
  }

  const groups = {} as Record<GroupLabel, TeamStanding[]>;
  for (const label of GROUP_LABELS) {
    const rows: TeamStanding[] = (data.groups[label] ?? []).map((s) => {
      const x = acc.get(s.team.id)!;
      return {
        team: s.team,
        group: label,
        rank: 0,
        played: x.played,
        win: x.win,
        draw: x.draw,
        loss: x.loss,
        goalsFor: x.gf,
        goalsAgainst: x.ga,
        goalDiff: x.gf - x.ga,
        points: x.points,
      };
    });
    rows.sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDiff - a.goalDiff ||
        b.goalsFor - a.goalsFor ||
        fifaRankOf(a.team.code ?? a.team.name) - fifaRankOf(b.team.code ?? b.team.name),
    );
    rows.forEach((r, i) => (r.rank = i + 1));
    groups[label] = rows;
  }
  return groups;
}

/** Fixtures as known at `beforeMs`: earlier results kept, the rest set open. */
function fixturesAsOf(data: WorldCupData, beforeMs: number): Fixture[] {
  return data.fixtures.map((f) => {
    const known = f.phase === "finished" && Date.parse(f.kickoff) < beforeMs;
    if (known) return f;
    return { ...f, phase: "scheduled", homeGoals: null, awayGoals: null };
  });
}

/**
 * Compute the kickoff-time impact on Korea for each given finished fixture.
 * Only pass the fixtures you actually display (this runs a scenario sim each).
 */
export function computeFinishedImpacts(
  data: WorldCupData,
  koreaId: number,
  targetFixtureIds: number[],
): Record<number, FinishedImpact> {
  const out: Record<number, FinishedImpact> = {};
  const targets = new Set(targetFixtureIds);

  for (const f of data.fixtures) {
    if (!targets.has(f.id)) continue;
    if (f.phase !== "finished" || f.homeGoals == null || f.awayGoals == null) continue;

    const kickoffMs = Date.parse(f.kickoff);
    const priorData: WorldCupData = {
      groups: standingsAsOf(data, kickoffMs),
      fixtures: fixturesAsOf(data, kickoffMs),
      updatedAt: data.updatedAt,
    };

    let report;
    try {
      report = computeScenarios(priorData, koreaId, { sampleBranches: SAMPLE });
    } catch {
      out[f.id] = { result: "neutral", note: "영향을 계산할 수 없습니다." };
      continue;
    }

    const impact = report.matchImpacts.find((m) => m.fixtureId === f.id);
    const r = impact?.ratios;
    if (!r) {
      out[f.id] = { result: "neutral", note: "한국 진출과 상관없는 경기입니다." };
      continue;
    }

    const avail = [r.home, r.draw, r.away].filter((v) => v >= 0);
    if (avail.length < 2 || Math.max(...avail) - Math.min(...avail) < EPS) {
      out[f.id] = { result: "neutral", note: "한국 진출과 상관없는 경기입니다." };
      continue;
    }

    const homeWin = f.homeGoals > f.awayGoals;
    const awayWin = f.homeGoals < f.awayGoals;
    const actual = homeWin ? r.home : awayWin ? r.away : r.draw;
    const otherPair = homeWin ? [r.draw, r.away] : awayWin ? [r.home, r.draw] : [r.home, r.away];
    const others = otherPair.filter((v) => v >= 0);
    const avgOther = others.reduce((s, v) => s + v, 0) / others.length;

    let result: FinishedResult;
    let note: string;
    if (actual > avgOther + EPS) {
      result = "good";
      note = "이 결과는 한국에 유리하게 작용했습니다.";
    } else if (actual < avgOther - EPS) {
      result = "bad";
      note = "이 결과는 한국에 불리하게 작용했습니다.";
    } else {
      result = "neutral";
      note = "한국 진출과 상관없는 경기입니다.";
    }
    out[f.id] = { result, note };
  }

  return out;
}
