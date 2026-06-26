import { fetchApiFootball, hasApiKey } from "./apiFootball";
import { buildMockData, MOCK_KOREA_ID } from "./mockData";
import { fetchWorldcup26 } from "./worldcup26";
import type { WorldCupData } from "./types";

export type SourceName = "worldcup26" | "apifootball" | "mock";

export interface DataResult {
  data: WorldCupData;
  source: SourceName;
  /** Korea's team id within the chosen source. */
  koreaId: number;
  /** Explains a fallback when the preferred source could not be used. */
  note?: string;
}

/**
 * Resolve the World Cup snapshot. Default source is the free worldcup26.ir API
 * (live 2026, no key). Set DATA_SOURCE=apifootball to use API-Football instead
 * (requires APISPORTS_KEY + a paid plan for 2026). Falls back to demo data with
 * an explanatory note on any failure.
 */
export async function getWorldCupData(): Promise<DataResult> {
  const preferred = (process.env.DATA_SOURCE as SourceName) ?? "worldcup26";
  const now = new Date().toISOString();
  const mock = (note?: string): DataResult => ({
    data: buildMockData(now),
    source: "mock",
    koreaId: MOCK_KOREA_ID,
    note,
  });

  if (preferred === "apifootball") {
    if (!hasApiKey()) return mock("APISPORTS_KEY가 설정되지 않았습니다.");
    try {
      return { data: await fetchApiFootball(), source: "apifootball", koreaId: 17 };
    } catch (err) {
      return mock(err instanceof Error ? err.message : "API-Football 호출 실패");
    }
  }

  // Default: worldcup26.ir
  try {
    const { data, koreaId } = await fetchWorldcup26();
    if (!koreaId) return mock("worldcup26: 한국 팀을 찾지 못했습니다.");
    return { data, source: "worldcup26", koreaId };
  } catch (err) {
    return mock(err instanceof Error ? err.message : "worldcup26 호출 실패");
  }
}
