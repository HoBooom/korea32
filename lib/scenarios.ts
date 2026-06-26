import { fifaRankOf } from "./fifaRanking";
import { GROUP_LABELS } from "./standings";
import { compareThirdPlace, tieNeedsDiscipline, THIRD_PLACE_SLOTS } from "./thirdPlace";
import { MARGIN_WEIGHTS, outcomeProb } from "./winProb";
import type {
  Fixture,
  GroupLabel,
  MatchImpact,
  ScenarioReport,
  TeamRef,
  ThirdPlaceEntry,
  WorldCupData,
} from "./types";

// --- Tunables -------------------------------------------------------------
/** Below this branch count we enumerate exhaustively; above it we sample. */
const EXACT_BRANCH_CAP = 60_000;
/** Random branches drawn when the exact space exceeds the cap. */
const SAMPLE_BRANCHES = 60_000;
/** Goal margins explored per match (GD-sensitive); weighted by MARGIN_WEIGHTS. */
const MARGINS = [1, 2, 3];

type Outcome = "HOME" | "DRAW" | "AWAY";

interface MatchOption {
  outcome: Outcome;
  homeGoals: number;
  awayGoals: number;
  /** Strength-based probability weight of this exact option (sums to ~1 per fixture). */
  prob: number;
}

interface FixtureOptions {
  fixture: Fixture;
  options: MatchOption[];
  isKoreaGroup: boolean;
}

interface Cum {
  team: TeamRef;
  group: GroupLabel;
  points: number;
  gf: number;
  ga: number;
  disciplinaryPoints?: number;
}

function pairKey(a: number, b: number): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

/** Pick one option in proportion to its probability weight. */
function weightedPick(options: MatchOption[]): MatchOption {
  let r = Math.random();
  for (const o of options) {
    r -= o.prob;
    if (r <= 0) return o;
  }
  return options[options.length - 1];
}

const MARGIN_TOTAL = MARGIN_WEIGHTS.reduce((a, b) => a + b, 0);

/** Build weighted options for a fixture from its strength-based outcome probs. */
function optionsFor(f: Fixture): MatchOption[] {
  const homeKey = f.home.code ?? f.home.name;
  const awayKey = f.away.code ?? f.away.name;
  const p = outcomeProb(homeKey, awayKey);
  const opts: MatchOption[] = [];
  MARGINS.forEach((m, i) => {
    const w = (MARGIN_WEIGHTS[i] ?? 0) / MARGIN_TOTAL;
    opts.push({ outcome: "HOME", homeGoals: m, awayGoals: 0, prob: p.home * w });
  });
  opts.push({ outcome: "DRAW", homeGoals: 0, awayGoals: 0, prob: p.draw });
  MARGINS.forEach((m, i) => {
    const w = (MARGIN_WEIGHTS[i] ?? 0) / MARGIN_TOTAL;
    opts.push({ outcome: "AWAY", homeGoals: 0, awayGoals: m, prob: p.away * w });
  });
  return opts;
}

/** Locate the group label that contains a given team. */
export function findTeamGroup(data: WorldCupData, teamId: number): GroupLabel | null {
  for (const label of GROUP_LABELS) {
    if (data.groups[label]?.some((s) => s.team.id === teamId)) return label;
  }
  return null;
}

/** Base cumulative stats per team from current standings. */
function buildBaseCum(data: WorldCupData): Map<number, Cum> {
  const map = new Map<number, Cum>();
  for (const label of GROUP_LABELS) {
    for (const s of data.groups[label] ?? []) {
      map.set(s.team.id, {
        team: s.team,
        group: label,
        points: s.points,
        gf: s.goalsFor,
        ga: s.goalsAgainst,
        disciplinaryPoints: s.disciplinaryPoints,
      });
    }
  }
  return map;
}

interface WorkStat {
  points: number;
  gf: number;
  ga: number;
}

/** Head-to-head capable group ranking (2026 rules). Returns ordered team ids. */
function rankGroup(
  groupTeamIds: number[],
  work: Map<number, WorkStat>,
  pairResults: Map<number, { homeId: number; hg: number; awayId: number; ag: number }>,
  nameOf: (id: number) => string,
): number[] {
  // Cluster by points, break ties with a mini-league among the tied teams.
  const byPoints = [...groupTeamIds].sort(
    (a, b) => (work.get(b)!.points) - (work.get(a)!.points),
  );

  const result: number[] = [];
  let i = 0;
  while (i < byPoints.length) {
    let j = i;
    const pts = work.get(byPoints[i])!.points;
    while (j < byPoints.length && work.get(byPoints[j])!.points === pts) j++;
    const cluster = byPoints.slice(i, j);
    if (cluster.length === 1) {
      result.push(cluster[0]);
    } else {
      result.push(...breakTie(cluster, work, pairResults, nameOf));
    }
    i = j;
  }
  return result;
}

function breakTie(
  cluster: number[],
  work: Map<number, WorkStat>,
  pairResults: Map<number, { homeId: number; hg: number; awayId: number; ag: number }>,
  nameOf: (id: number) => string,
): number[] {
  // Mini-league using only matches between the tied teams.
  const mini = new Map<number, WorkStat>();
  for (const id of cluster) mini.set(id, { points: 0, gf: 0, ga: 0 });
  for (let a = 0; a < cluster.length; a++) {
    for (let b = a + 1; b < cluster.length; b++) {
      const res = pairResults.get(idxKey(cluster[a], cluster[b]));
      if (!res) continue;
      const ga = mini.get(cluster[a])!;
      const gb = mini.get(cluster[b])!;
      const [sa, sb] =
        res.homeId === cluster[a] ? [res.hg, res.ag] : [res.ag, res.hg];
      ga.gf += sa; ga.ga += sb;
      gb.gf += sb; gb.ga += sa;
      if (sa > sb) ga.points += 3;
      else if (sa < sb) gb.points += 3;
      else { ga.points += 1; gb.points += 1; }
    }
  }
  return [...cluster].sort((a, b) => {
    const ma = mini.get(a)!, mb = mini.get(b)!;
    if (ma.points !== mb.points) return mb.points - ma.points;
    const mgd = (mb.gf - mb.ga) - (ma.gf - ma.ga);
    if (mgd !== 0) return mgd;
    if (mb.gf !== ma.gf) return mb.gf - ma.gf;
    // Fall back to overall GD / GF / FIFA ranking.
    const wa = work.get(a)!, wb = work.get(b)!;
    const ogd = (wb.gf - wb.ga) - (wa.gf - wa.ga);
    if (ogd !== 0) return ogd;
    if (wb.gf !== wa.gf) return wb.gf - wa.gf;
    return fifaRankOf(nameOf(a)) - fifaRankOf(nameOf(b));
  });
}

// keyed lookup using sorted pair (alias of pairKey but on numbers)
function idxKey(a: number, b: number): number {
  // pack into a single number key for Map performance (ids < ~10^6)
  return a < b ? a * 1_000_000 + b : b * 1_000_000 + a;
}

interface BranchResult {
  qualifies: boolean;
  /** Korea's fate came down to fair-play data we may not have. */
  disciplineGap: boolean;
}

/**
 * Engine state precomputed once, reused across every enumerated branch.
 */
class Engine {
  readonly koreaId: number;
  readonly koreaGroup: GroupLabel;
  readonly base: Map<number, Cum>;
  readonly groupTeamIds: Record<GroupLabel, number[]>;
  /** Results of already-finished matches, keyed by packed pair id. */
  readonly finishedPairs: Map<number, { homeId: number; hg: number; awayId: number; ag: number }>;
  /** Cumulative deltas already baked into `base`? No — base is current totals. */
  readonly remaining: FixtureOptions[];

  constructor(data: WorldCupData, koreaId: number) {
    this.koreaId = koreaId;
    const kg = findTeamGroup(data, koreaId);
    if (!kg) throw new Error(`Korea (id ${koreaId}) not found in standings`);
    this.koreaGroup = kg;
    this.base = buildBaseCum(data);

    this.groupTeamIds = {} as Record<GroupLabel, number[]>;
    for (const label of GROUP_LABELS) {
      this.groupTeamIds[label] = (data.groups[label] ?? []).map((s) => s.team.id);
    }

    this.finishedPairs = new Map();
    this.remaining = [];
    for (const f of data.fixtures) {
      if (f.phase === "finished" && f.homeGoals != null && f.awayGoals != null) {
        this.finishedPairs.set(idxKey(f.home.id, f.away.id), {
          homeId: f.home.id, hg: f.homeGoals, awayId: f.away.id, ag: f.awayGoals,
        });
      } else {
        this.remaining.push({
          fixture: f,
          isKoreaGroup: f.group === kg,
          options: optionsFor(f),
        });
      }
    }
  }

  // Returns a ranking key (FIFA code if available, else name) for fifaRankOf.
  nameOf = (id: number): string => {
    const t = this.base.get(id)?.team;
    return t?.code ?? t?.name ?? "";
  };

  /** Evaluate one branch given a chosen option per remaining fixture. */
  evaluate(picks: MatchOption[]): BranchResult {
    // Working cumulative = base totals + this branch's remaining results.
    const work = new Map<number, WorkStat>();
    for (const [id, c] of this.base) {
      work.set(id, { points: c.points, gf: c.gf, ga: c.ga });
    }
    const pairs = new Map(this.finishedPairs);

    for (let i = 0; i < this.remaining.length; i++) {
      const f = this.remaining[i].fixture;
      const o = picks[i];
      const home = work.get(f.home.id)!;
      const away = work.get(f.away.id)!;
      home.gf += o.homeGoals; home.ga += o.awayGoals;
      away.gf += o.awayGoals; away.ga += o.homeGoals;
      if (o.outcome === "HOME") home.points += 3;
      else if (o.outcome === "AWAY") away.points += 3;
      else { home.points += 1; away.points += 1; }
      pairs.set(idxKey(f.home.id, f.away.id), {
        homeId: f.home.id, hg: o.homeGoals, awayId: f.away.id, ag: o.awayGoals,
      });
    }

    // Korea's own group placement.
    const koreaOrder = rankGroup(this.groupTeamIds[this.koreaGroup], work, pairs, this.nameOf);
    const koreaRank = koreaOrder.indexOf(this.koreaId) + 1;
    if (koreaRank <= 2) return { qualifies: true, disciplineGap: false };
    if (koreaRank >= 4) return { qualifies: false, disciplineGap: false };

    // Korea is 3rd -> compare against the other groups' third-placed teams.
    const thirds: ThirdPlaceEntry[] = [];
    for (const label of GROUP_LABELS) {
      const order = rankGroup(this.groupTeamIds[label], work, pairs, this.nameOf);
      const thirdId = order[2];
      if (thirdId == null) continue;
      const w = work.get(thirdId)!;
      const meta = this.base.get(thirdId)!;
      thirds.push({
        team: meta.team,
        group: label,
        points: w.points,
        goalDiff: w.gf - w.ga,
        goalsFor: w.gf,
        disciplinaryPoints: meta.disciplinaryPoints,
      });
    }
    const ranked = [...thirds].sort(compareThirdPlace);
    const pos = ranked.findIndex((e) => e.team.id === this.koreaId) + 1;
    const qualifies = pos >= 1 && pos <= THIRD_PLACE_SLOTS;

    // Did Korea sit right on the cut line against an entry we can't separate?
    let disciplineGap = false;
    const korea = ranked[pos - 1];
    const neighbor = qualifies ? ranked[THIRD_PLACE_SLOTS] : ranked[THIRD_PLACE_SLOTS - 1];
    if (korea && neighbor && tieNeedsDiscipline(korea, neighbor)) disciplineGap = true;

    return { qualifies, disciplineGap };
  }
}

interface OutcomeTally {
  HOME: { n: number; q: number };
  DRAW: { n: number; q: number };
  AWAY: { n: number; q: number };
}

function emptyTally(): OutcomeTally {
  return { HOME: { n: 0, q: 0 }, DRAW: { n: 0, q: 0 }, AWAY: { n: 0, q: 0 } };
}

export interface ScenarioComputation extends ScenarioReport {
  /** Enumeration mode used. */
  mode: "exact" | "sampled";
  totalBranches: number;
}

/**
 * Main entry: compute Korea's qualification outlook from a data snapshot.
 */
export function computeScenarios(
  data: WorldCupData,
  koreaId: number,
  opts?: { sampleBranches?: number },
): ScenarioComputation {
  const sampleBranches = opts?.sampleBranches ?? SAMPLE_BRANCHES;
  const engine = new Engine(data, koreaId);
  const fixturesOpts = engine.remaining;
  const lengths = fixturesOpts.map((fo) => fo.options.length);
  const totalExact = lengths.reduce((acc, n) => acc * n, 1);

  const tallies: OutcomeTally[] = fixturesOpts.map(() => emptyTally());
  let total = 0;
  let qual = 0;
  let disciplineDependent = false;

  // Each branch contributes its probability weight, so the ratio is a real
  // (strength-weighted) probability rather than an equal-weight scenario count.
  const handleBranch = (picks: MatchOption[], weight: number) => {
    const { qualifies, disciplineGap } = engine.evaluate(picks);
    total += weight;
    if (qualifies) qual += weight;
    if (disciplineGap) disciplineDependent = true;
    for (let i = 0; i < picks.length; i++) {
      const t = tallies[i][picks[i].outcome];
      t.n += weight;
      if (qualifies) t.q += weight;
    }
  };

  const mode: "exact" | "sampled" = totalExact <= EXACT_BRANCH_CAP ? "exact" : "sampled";

  if (mode === "exact") {
    const picks: MatchOption[] = new Array(fixturesOpts.length);
    for (let idx = 0; idx < totalExact; idx++) {
      let rem = idx;
      let weight = 1;
      for (let f = 0; f < fixturesOpts.length; f++) {
        const len = lengths[f];
        const opt = fixturesOpts[f].options[rem % len];
        picks[f] = opt;
        weight *= opt.prob;
        rem = Math.floor(rem / len);
      }
      handleBranch(picks, weight);
    }
  } else {
    // Monte Carlo: sample each outcome by its strength weight (each sample = 1).
    for (let s = 0; s < sampleBranches; s++) {
      const picks = fixturesOpts.map((fo) => weightedPick(fo.options));
      handleBranch(picks, 1);
    }
  }

  const scenarioRatio = total === 0 ? 0 : qual / total;
  const status: ScenarioReport["status"] =
    scenarioRatio >= 0.9999 ? "IN" : scenarioRatio <= 0.0001 ? "OUT" : "CONTENDS";

  // Per-match impacts (favorable outcomes) — used by today's matches section.
  const matchImpacts: MatchImpact[] = fixturesOpts.map((fo, i) => {
    const t = tallies[i];
    const ratio = (o: keyof OutcomeTally) => (t[o].n === 0 ? -1 : t[o].q / t[o].n);
    const rHome = ratio("HOME"), rDraw = ratio("DRAW"), rAway = ratio("AWAY");
    const best = Math.max(rHome, rDraw, rAway);
    const fav = (r: number) => r >= 0 && r >= best - 1e-9 && best > scenarioRatio + 1e-9;
    return {
      fixtureId: fo.fixture.id,
      favorable: { home: fav(rHome), draw: fav(rDraw), away: fav(rAway) },
      ratios: { home: rHome, draw: rDraw, away: rAway },
      note: impactNote(fo.fixture, rHome, rDraw, rAway, scenarioRatio),
    };
  });

  // Korea's own remaining match -> human conditions.
  const koreaFixtureIdx = fixturesOpts.findIndex(
    (fo) => fo.fixture.home.id === koreaId || fo.fixture.away.id === koreaId,
  );
  const requiredConditions = buildConditions(
    status,
    scenarioRatio,
    koreaFixtureIdx >= 0 ? fixturesOpts[koreaFixtureIdx] : null,
    koreaFixtureIdx >= 0 ? tallies[koreaFixtureIdx] : null,
    koreaId,
    disciplineDependent,
  );

  // Key matches: remaining fixtures whose outcome materially swings Korea's odds.
  const keyMatches: Fixture[] = fixturesOpts
    .map((fo, i) => ({ fo, swing: swingOf(tallies[i]) }))
    .filter((x) => x.swing > 0.01)
    .sort((a, b) => b.swing - a.swing)
    .slice(0, 8)
    .map((x) => x.fo.fixture);

  return {
    status,
    scenarioRatio,
    requiredConditions,
    keyMatches,
    matchImpacts,
    disciplinaryDependent: disciplineDependent,
    mode,
    totalBranches: total,
  };
}

function swingOf(t: OutcomeTally): number {
  const rs = (["HOME", "DRAW", "AWAY"] as const)
    .map((o) => (t[o].n === 0 ? null : t[o].q / t[o].n))
    .filter((r): r is number => r != null);
  if (rs.length < 2) return 0;
  return Math.max(...rs) - Math.min(...rs);
}

function pct(r: number): string {
  return `${Math.round(r * 100)}%`;
}

function impactNote(
  f: Fixture,
  rHome: number,
  rDraw: number,
  rAway: number,
  base: number,
): string {
  const parts: string[] = [];
  if (rHome >= 0) parts.push(`${f.home.name} 승리 시 ${pct(rHome)}`);
  if (rDraw >= 0) parts.push(`무승부 시 ${pct(rDraw)}`);
  if (rAway >= 0) parts.push(`${f.away.name} 승리 시 ${pct(rAway)}`);
  return `한국 진출 경우의 수 — ${parts.join(" · ")}`;
}

function buildConditions(
  status: ScenarioReport["status"],
  ratio: number,
  koreaFo: FixtureOptions | null,
  koreaTally: OutcomeTally | null,
  koreaId: number,
  disciplineDependent: boolean,
): string[] {
  if (status === "IN") {
    return ["남은 결과와 무관하게 한국의 32강 진출이 확정되었습니다. 🎉"];
  }
  if (status === "OUT") {
    return ["아쉽지만 현재 한국의 32강 진출 가능성이 없습니다."];
  }

  const lines: string[] = [`현재 예상 진출 확률 약 ${pct(ratio)}.`];

  if (koreaFo && koreaTally) {
    const koreaIsHome = koreaFo.fixture.home.id === koreaId;
    const opponent = koreaIsHome ? koreaFo.fixture.away.name : koreaFo.fixture.home.name;
    const winOutcome: keyof OutcomeTally = koreaIsHome ? "HOME" : "AWAY";
    const loseOutcome: keyof OutcomeTally = koreaIsHome ? "AWAY" : "HOME";

    const phrase = (o: keyof OutcomeTally, verb: string) => {
      const t = koreaTally[o];
      if (t.n === 0) return null;
      const r = t.q / t.n;
      if (r >= 0.9999) return `한국이 ${verb} 진출 확정.`;
      if (r <= 0.0001) return `한국이 ${verb} 진출 불가.`;
      return `한국이 ${verb} 진출 확률 약 ${pct(r)} (다른 조 결과에 따라 결정).`;
    };
    const w = phrase(winOutcome, `${opponent}을(를) 상대로 이기면`);
    const d = phrase("DRAW", "비기면");
    const l = phrase(loseOutcome, "지면");
    for (const s of [w, d, l]) if (s) lines.push(s);
  }

  if (disciplineDependent) {
    lines.push(
      "⚠️ 일부 경우의 수는 페어플레이(경고/퇴장) 점수로 갈릴 수 있어 별도 확인이 필요합니다.",
    );
  }
  return lines;
}
