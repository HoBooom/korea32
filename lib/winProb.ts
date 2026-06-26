import { fifaRankOf } from "./fifaRanking";

// Strength-based match outcome probabilities, derived from FIFA ranking.
// Used to weight the qualification simulation so the headline number is a real
// (model) probability rather than an equal-weight count of scenarios.
//
// This is an approximation (no betting odds): it won't exactly match any single
// site, but lands in a realistic range and reacts to team strength.

export interface OutcomeProb {
  home: number;
  draw: number;
  away: number;
}

/**
 * @param homeKey FIFA code or name of the home side
 * @param awayKey FIFA code or name of the away side
 */
export function outcomeProb(homeKey: string, awayKey: string): OutcomeProb {
  const rh = fifaRankOf(homeKey);
  const ra = fifaRankOf(awayKey);
  // Positive diff => home is the stronger (lower-ranked) side.
  const diff = ra - rh;

  // Logistic expectation excluding draws; ~0.5 when evenly matched.
  const pHomeCore = 1 / (1 + Math.pow(10, -diff / 16));
  // Draws are likelier between evenly matched teams, rarer in mismatches.
  const pDraw = 0.26 * Math.exp(-Math.abs(diff) / 30);

  const home = (1 - pDraw) * pHomeCore;
  const away = (1 - pDraw) * (1 - pHomeCore);
  return { home, draw: pDraw, away };
}

/** Probability weights for winning by [1, 2, 3+] goals. */
export const MARGIN_WEIGHTS = [0.5, 0.3, 0.2];
