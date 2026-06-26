// Curated "한국에 유리한 결과" rules for specific final-round matches.
// These take PRIORITY over the computed engine on the schedule, and capture
// goal-difference conditions the probabilistic engine approximates away.
// Keyed by the two teams' FIFA codes (order-independent).

type ResultSpec =
  | { kind: "win" } // target team must win
  | { kind: "winBy"; goals: number } // win by >= goals
  | { kind: "drawOrWin" } // win or draw
  | { kind: "noLossOrCloseLoss"; goals: number }; // win / draw / lose by <= goals

interface Rule {
  /** the two teams (FIFA codes) */
  pair: [string, string];
  /** team the condition is phrased about (FIFA code) */
  team: string;
  spec: ResultSpec;
  /** clean Korean condition label (without the "시 유리" suffix) */
  label: string;
}

const RULES: Rule[] = [
  { pair: ["GER", "ECU"], team: "GER", spec: { kind: "drawOrWin" }, label: "독일 승리 또는 무승부" },
  { pair: ["ALG", "AUT"], team: "AUT", spec: { kind: "win" }, label: "오스트리아 승리" },
  { pair: ["CRO", "GHA"], team: "GHA", spec: { kind: "win" }, label: "가나 승리" },
  { pair: ["CPV", "KSA"], team: "KSA", spec: { kind: "win" }, label: "사우디아라비아 승리" },
  { pair: ["JPN", "SWE"], team: "JPN", spec: { kind: "winBy", goals: 2 }, label: "일본 2골차 이상 승리" },
  { pair: ["COD", "UZB"], team: "UZB", spec: { kind: "drawOrWin" }, label: "우즈베키스탄 승리 또는 무승부" },
  {
    pair: ["SEN", "IRQ"],
    team: "IRQ",
    spec: { kind: "noLossOrCloseLoss", goals: 1 },
    label: "이라크 승리·무승부 또는 1골차 패배",
  },
  { pair: ["AUS", "PAR"], team: "AUS", spec: { kind: "win" }, label: "호주 승리" },
  { pair: ["BEL", "NZL"], team: "NZL", spec: { kind: "win" }, label: "뉴질랜드 승리" },
];

function samePair(a: string, b: string, p: [string, string]): boolean {
  return (a === p[0] && b === p[1]) || (a === p[1] && b === p[0]);
}

/** Find a curated rule for a fixture by its two FIFA codes. */
export function curatedRuleFor(homeCode?: string, awayCode?: string): Rule | null {
  if (!homeCode || !awayCode) return null;
  return RULES.find((r) => samePair(homeCode, awayCode, r.pair)) ?? null;
}

/** Goal margin (gf - ga) for the rule's target team, given a final score. */
function targetMargin(rule: Rule, homeCode: string, homeGoals: number, awayGoals: number): number {
  return rule.team === homeCode ? homeGoals - awayGoals : awayGoals - homeGoals;
}

/** Whether a finished result satisfies the curated favorable condition. */
export function curatedSatisfied(
  rule: Rule,
  homeCode: string,
  homeGoals: number,
  awayGoals: number,
): boolean {
  const m = targetMargin(rule, homeCode, homeGoals, awayGoals);
  switch (rule.spec.kind) {
    case "win":
      return m > 0;
    case "winBy":
      return m >= rule.spec.goals;
    case "drawOrWin":
      return m >= 0;
    case "noLossOrCloseLoss":
      return m >= -rule.spec.goals;
  }
}

export function curatedLabel(rule: Rule): string {
  return `${rule.label} 시 유리`;
}
