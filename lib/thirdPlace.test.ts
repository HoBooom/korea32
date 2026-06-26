import { describe, expect, it } from "vitest";
import { compareThirdPlace, rankThirdPlace, thirdPlacePosition } from "./thirdPlace";
import type { ThirdPlaceEntry } from "./types";

function entry(
  name: string,
  group: ThirdPlaceEntry["group"],
  points: number,
  goalDiff: number,
  goalsFor: number,
  disciplinaryPoints?: number,
  id = name.length,
): ThirdPlaceEntry {
  return {
    team: { id, name },
    group,
    points,
    goalDiff,
    goalsFor,
    disciplinaryPoints,
  };
}

describe("compareThirdPlace tiebreaker order", () => {
  it("ranks by points first", () => {
    const a = entry("A", "A", 4, 0, 2);
    const b = entry("B", "B", 3, 9, 9);
    expect(compareThirdPlace(a, b)).toBeLessThan(0);
  });

  it("falls to goal difference when points equal", () => {
    const a = entry("A", "A", 3, 1, 2);
    const b = entry("B", "B", 3, 2, 2);
    expect(compareThirdPlace(a, b)).toBeGreaterThan(0); // b ranks above
  });

  it("falls to goals scored when points and GD equal", () => {
    const a = entry("A", "A", 3, 1, 4);
    const b = entry("B", "B", 3, 1, 2);
    expect(compareThirdPlace(a, b)).toBeLessThan(0); // a (more goals) above
  });

  it("uses discipline (fewer cards better) when both known", () => {
    const a = entry("A", "A", 3, 1, 2, 2);
    const b = entry("B", "B", 3, 1, 2, 1);
    expect(compareThirdPlace(a, b)).toBeGreaterThan(0); // b cleaner -> above
  });

  it("falls to FIFA ranking as final tiebreaker", () => {
    const a = entry("Brazil", "A", 3, 1, 2);
    const b = entry("Panama", "B", 3, 1, 2);
    expect(compareThirdPlace(a, b)).toBeLessThan(0); // Brazil ranked higher
  });
});

describe("rankThirdPlace / thirdPlacePosition", () => {
  it("orders entries and finds Korea's slot", () => {
    const entries = [
      entry("Panama", "A", 2, -1, 1, 2, 100),
      entry("Korea", "B", 4, 1, 3, 1, 17),
      entry("Ecuador", "C", 2, -1, 1, 1, 101),
      entry("Qatar", "D", 1, -3, 1, 0, 102),
    ];
    const ranked = rankThirdPlace(entries);
    expect(ranked[0].team.name).toBe("Korea");
    // Ecuador above Panama by discipline (1 < 2)
    expect(ranked[1].team.name).toBe("Ecuador");
    expect(ranked[2].team.name).toBe("Panama");
    expect(thirdPlacePosition(entries, 17)).toBe(1);
    expect(thirdPlacePosition(entries, 999)).toBeNull();
  });
});
