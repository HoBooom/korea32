"use client";

import { useEffect, useMemo, useState } from "react";
import type { Snapshot } from "@/lib/snapshot";
import type { MatchImpact } from "@/lib/types";
import { formatKSTTime } from "@/lib/format";
import KoreaStatus from "./KoreaStatus";
import GroupTable from "./GroupTable";
import ThirdPlaceRace from "./ThirdPlaceRace";
import TodayMatches from "./TodayMatches";
import ScenarioList from "./ScenarioList";

export default function Dashboard({ initial }: { initial: Snapshot }) {
  const [snap, setSnap] = useState<Snapshot>(initial);

  // Auto-update on an interval only — no manual trigger is exposed, so deployed
  // visitors cannot fire ad-hoc API calls. Upstream fetches stay cached (~30s),
  // so polling keeps the page fresh without hammering the data source.
  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await fetch("/api/worldcup", { cache: "no-store" });
        if (res.ok) setSnap((await res.json()) as Snapshot);
      } catch {
        // keep showing the last good snapshot
      }
    };
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, []);

  const {
    data,
    scenarios,
    koreaId,
    koreaGroup,
    thirdPlaceRanking,
    finishedImpacts,
    usingMockData,
    dataNote,
  } = snap;

  const impacts = useMemo(() => {
    const m: Record<number, MatchImpact> = {};
    for (const mi of scenarios.matchImpacts) m[mi.fixtureId] = mi;
    return m;
  }, [scenarios.matchImpacts]);

  const koreaStandings = koreaGroup ? data.groups[koreaGroup] ?? [] : [];

  return (
    <div className="flex min-h-full flex-col bg-canvas">
      {/* primary nav — deep navy chrome */}
      <header className="sticky top-0 z-10 bg-navy">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-baseline gap-3">
            <span className="text-xl font-bold tracking-display text-on-primary">
              한국<span className="text-primary">32</span>강
            </span>
            <span className="hidden text-[11px] font-bold label-caps text-footer-muted sm:inline">
              2026 World Cup Tracker
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
            <span className="text-[11px] font-medium text-footer-muted">
              실시간 자동 갱신 · {formatKSTTime(data.updatedAt)}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 md:px-6 md:py-12">
        {usingMockData && (
          <div className="mb-8 rounded-[8px] border border-line bg-mist px-4 py-3 text-sm text-body">
            ⚠️ 실시간 데이터 소스에 연결하지 못해 데모 데이터로 동작 중입니다.
            {dataNote && <div className="mt-1 text-xs text-muted">사유: {dataNote}</div>}
          </div>
        )}

        <div className="flex flex-col gap-12">
          {/* ① 상단: 진출 확률 + 조 3위 순위 */}
          <div className="flex flex-col gap-6">
            <KoreaStatus
              status={scenarios.status}
              ratio={scenarios.scenarioRatio}
              conditions={scenarios.requiredConditions}
              koreaGroup={koreaGroup}
            />
            <div className="grid gap-6 lg:grid-cols-2">
              {koreaGroup && (
                <GroupTable group={koreaGroup} standings={koreaStandings} koreaId={koreaId} />
              )}
              <ThirdPlaceRace ranking={thirdPlaceRanking} koreaId={koreaId} />
            </div>
          </div>

          {/* ② 중단: 남은 경기 일정 (오늘~+3일) */}
          <TodayMatches
            fixtures={data.fixtures}
            impacts={impacts}
            finishedImpacts={finishedImpacts}
            koreaId={koreaId}
          />

          {/* ③ 하단: 향후 일정별 진출 조건 */}
          <ScenarioList
            conditions={scenarios.requiredConditions}
            upcoming={scenarios.keyMatches}
            impacts={impacts}
            koreaId={koreaId}
          />
        </div>
      </main>

      <footer className="bg-deep-navy">
        <div className="mx-auto max-w-[1200px] px-4 py-8 text-xs text-footer-muted md:px-6">
          <div className="font-bold text-on-primary">
            한국<span className="text-primary">32</span>강
          </div>
          <p className="mt-2 leading-relaxed">
            데이터 출처:{" "}
            {snap.source === "worldcup26"
              ? "worldcup26.ir (오픈소스, 실시간)"
              : snap.source === "apifootball"
                ? "API-Football"
                : "데모 데이터"}{" "}
            · 진출 가능성은 남은 경기의 경우의 수 비율이며 실제 확률과 다를 수 있습니다. 경기 시각은
            개최지 현지시각 기준으로 근사 변환됩니다.
          </p>
        </div>
      </footer>
    </div>
  );
}
