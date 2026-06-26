// Domain types — normalized, decoupled from the API-Football response shape.

export type GroupLabel =
  | "A" | "B" | "C" | "D" | "E" | "F"
  | "G" | "H" | "I" | "J" | "K" | "L";

/** Match lifecycle, collapsed from API-Football's many status codes. */
export type MatchPhase = "scheduled" | "live" | "finished";

export interface TeamRef {
  id: number;
  name: string;
  /** Country flag URL if provided by the source. */
  logo?: string;
  /** FIFA 3-letter code (e.g. KOR) — stable key for ranking lookups. */
  code?: string;
}

/** A team's cumulative record within its group. */
export interface TeamStanding {
  team: TeamRef;
  group: GroupLabel;
  /** 1-based position inside the group as reported by the source. */
  rank: number;
  played: number;
  win: number;
  draw: number;
  loss: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  /**
   * Fair-play / disciplinary points (lower is better). Optional because the
   * free API tier does not always expose card data; undefined => unknown.
   */
  disciplinaryPoints?: number;
}

export interface Fixture {
  id: number;
  group: GroupLabel;
  home: TeamRef;
  away: TeamRef;
  /** ISO 8601 kickoff time (UTC). */
  kickoff: string;
  /** Group-stage matchday (1–3) when known. */
  matchday?: number;
  phase: MatchPhase;
  /** Goals so far / final. Null until the match has data. */
  homeGoals: number | null;
  awayGoals: number | null;
  /** API-Football raw status short code, kept for debugging/display. */
  statusShort?: string;
}

/** Everything the UI needs, already normalized. */
export interface WorldCupData {
  /** Group label -> standings (sorted by rank). */
  groups: Record<GroupLabel, TeamStanding[]>;
  fixtures: Fixture[];
  /** ISO timestamp of when this snapshot was fetched. */
  updatedAt: string;
}

/** One third-placed team across all 12 groups, for cross-group ranking. */
export interface ThirdPlaceEntry {
  team: TeamRef;
  group: GroupLabel;
  points: number;
  goalDiff: number;
  goalsFor: number;
  disciplinaryPoints?: number;
}

export type QualificationStatus = "IN" | "OUT" | "CONTENDS";

/** Result of a single hypothetical fixture outcome in the scenario engine. */
export type MatchOutcome = "HOME" | "DRAW" | "AWAY";

export interface MatchImpact {
  fixtureId: number;
  /** Which outcome (if any) of this match is favorable for Korea. */
  favorable: { home: boolean; draw: boolean; away: boolean };
  /** Korea's qualifying ratio conditional on each outcome (-1 if impossible). */
  ratios: { home: number; draw: number; away: number };
  note: string;
}

export interface ScenarioReport {
  status: QualificationStatus;
  /** Share of enumerated branches in which Korea advances (0–1). */
  scenarioRatio: number;
  /** Human-readable qualification conditions, Korean. */
  requiredConditions: string[];
  /** Fixtures most relevant to Korea's fate. */
  keyMatches: Fixture[];
  /** Per-match favorability for today's matches section. */
  matchImpacts: MatchImpact[];
  /** True if any decisive branch came down to fair-play/discipline (data gap). */
  disciplinaryDependent: boolean;
}
