import { fifaRankOf } from "./fifaRanking";
import type { ThirdPlaceEntry } from "./types";

/**
 * Cross-group ranking of third-placed teams (2026 World Cup rules):
 *   1. points (desc)
 *   2. goal difference, all matches (desc)
 *   3. goals scored, all matches (desc)
 *   4. disciplinary / fair-play points, lower is better (asc)
 *   5. FIFA ranking (asc)
 *
 * Returns < 0 if `a` ranks ABOVE `b`, > 0 if below, 0 if truly tied.
 */
export function compareThirdPlace(a: ThirdPlaceEntry, b: ThirdPlaceEntry): number {
  if (a.points !== b.points) return b.points - a.points;
  if (a.goalDiff !== b.goalDiff) return b.goalDiff - a.goalDiff;
  if (a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor;

  // Discipline only breaks the tie when known for both teams.
  if (a.disciplinaryPoints != null && b.disciplinaryPoints != null) {
    if (a.disciplinaryPoints !== b.disciplinaryPoints) {
      return a.disciplinaryPoints - b.disciplinaryPoints;
    }
  }

  return fifaRankOf(a.team.code ?? a.team.name) - fifaRankOf(b.team.code ?? b.team.name);
}

/** True if the tie between two entries can only be resolved by discipline data. */
export function tieNeedsDiscipline(a: ThirdPlaceEntry, b: ThirdPlaceEntry): boolean {
  return (
    a.points === b.points &&
    a.goalDiff === b.goalDiff &&
    a.goalsFor === b.goalsFor &&
    (a.disciplinaryPoints == null || b.disciplinaryPoints == null)
  );
}

/** Sorted copy, best-third-placed team first. */
export function rankThirdPlace(entries: ThirdPlaceEntry[]): ThirdPlaceEntry[] {
  return [...entries].sort(compareThirdPlace);
}

/** Number of best third-placed teams that advance to the round of 32. */
export const THIRD_PLACE_SLOTS = 8;

/**
 * 1-based position of `teamId` among the third-placed teams, or null if that
 * team is not currently a third-placed team. Position <= THIRD_PLACE_SLOTS means
 * it would qualify.
 */
export function thirdPlacePosition(
  entries: ThirdPlaceEntry[],
  teamId: number,
): number | null {
  const ranked = rankThirdPlace(entries);
  const idx = ranked.findIndex((e) => e.team.id === teamId);
  return idx === -1 ? null : idx + 1;
}
