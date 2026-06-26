import { getWorldCupData, type SourceName } from "./dataSource";
import { thirdPlaceEntries } from "./standings";
import { rankThirdPlace } from "./thirdPlace";
import { computeScenarios, findTeamGroup, type ScenarioComputation } from "./scenarios";
import { computeFinishedImpacts, type FinishedImpact } from "./finishedImpact";
import { kstDateKey, todayKSTKey } from "./format";
import type { GroupLabel, ThirdPlaceEntry, WorldCupData } from "./types";

export interface Snapshot {
  data: WorldCupData;
  scenarios: ScenarioComputation;
  koreaId: number;
  koreaGroup: GroupLabel | null;
  /** Third-placed teams ranked best-first, with qualify flag (top 8). */
  thirdPlaceRanking: Array<ThirdPlaceEntry & { position: number; qualifies: boolean }>;
  /** Counterfactual impact of finished matches on Korea, keyed by fixture id. */
  finishedImpacts: Record<number, FinishedImpact>;
  usingMockData: boolean;
  source: SourceName;
  /** Why mock data is shown despite a key being set, if applicable. */
  dataNote?: string;
}

/** Build the full data + analysis snapshot the UI renders. */
export async function getSnapshot(): Promise<Snapshot> {
  const { data, source, note, koreaId: resolvedKoreaId } = await getWorldCupData();
  // Env override wins, else use the id resolved by the data source.
  const koreaId = process.env.KOREA_TEAM_ID ? Number(process.env.KOREA_TEAM_ID) : resolvedKoreaId;
  const scenarios = computeScenarios(data, koreaId);
  const koreaGroup = findTeamGroup(data, koreaId);

  const ranked = rankThirdPlace(thirdPlaceEntries(data.groups)).map((e, i) => ({
    ...e,
    position: i + 1,
    qualifies: i < 8,
  }));

  // Only today's finished matches are displayed with O/X; each impact runs a
  // kickoff-time simulation, so limit the work to those fixtures.
  const today = todayKSTKey();
  const todayFinishedIds = data.fixtures
    .filter((f) => f.phase === "finished" && kstDateKey(f.kickoff) === today)
    .map((f) => f.id);
  const finishedImpacts = computeFinishedImpacts(data, koreaId, todayFinishedIds);

  return {
    data,
    scenarios,
    koreaId,
    koreaGroup,
    thirdPlaceRanking: ranked,
    finishedImpacts,
    usingMockData: source === "mock",
    source,
    dataNote: note,
  };
}
