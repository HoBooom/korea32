"use client";

import { useState } from "react";
import { formatKST } from "@/lib/format";
import type { Fixture, MatchImpact } from "@/lib/types";

interface Props {
  conditions: string[];
  upcoming: Fixture[];
  impacts: Record<number, MatchImpact>;
  koreaId: number;
}

type Filter = "all" | "korea";

function favorableText(f: Fixture, impact: MatchImpact): string {
  const outs: string[] = [];
  if (impact.favorable.home) outs.push(`${f.home.name} 승리`);
  if (impact.favorable.draw) outs.push("무승부");
  if (impact.favorable.away) outs.push(`${f.away.name} 승리`);
  return outs.length ? `한국에 유리: ${outs.join(" 또는 ")}` : "한국 진출에 큰 영향 없음";
}

export default function ScenarioList({ conditions, upcoming, impacts, koreaId }: Props) {
  const [filter, setFilter] = useState<Filter>("all");

  const matches = upcoming.filter((f) => {
    if (filter === "korea") return f.home.id === koreaId || f.away.id === koreaId;
    return true;
  });

  return (
    <section>
      <div className="text-[12px] font-bold label-caps text-primary">Scenarios</div>
      <h2 className="mt-1 text-2xl font-bold tracking-display text-ink">향후 일정별 진출 조건</h2>
      <p className="mt-1 text-[14px] text-muted">
        남은 경기에서 어떤 결과가 나와야 한국이 32강에 오르는지 정리했습니다.
      </p>

      {/* Narrative conditions */}
      <div className="mt-5 overflow-hidden rounded-[8px] border border-line bg-mist divide-y divide-line">
        {conditions.map((c, i) => (
          <div key={i} className="px-4 py-3 text-[15px] leading-relaxed text-body">
            {c}
          </div>
        ))}
      </div>

      {/* Filter tabs (rectangular, navy underline active) */}
      <div className="mt-6 flex gap-1 border-b border-line">
        {(
          [
            { key: "all", label: "전체 변수 경기" },
            { key: "korea", label: "한국 경기만" },
          ] as Array<{ key: Filter; label: string }>
        ).map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-bold transition-colors ${
              filter === c.key
                ? "border-primary text-navy"
                : "border-transparent text-muted"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Key matches */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {matches.length === 0 && (
          <p className="rounded-[8px] border border-line bg-mist p-4 text-sm text-muted">
            표시할 경기가 없습니다.
          </p>
        )}
        {matches.map((f) => {
          const impact = impacts[f.id];
          return (
            <div key={f.id} className="rounded-[8px] border border-line bg-mist p-4">
              <div className="text-[12px] font-medium text-muted">
                {f.group}조 · {formatKST(f.kickoff)}
              </div>
              <div className="mt-2 font-bold text-ink">
                {f.home.name} <span className="text-muted">vs</span> {f.away.name}
              </div>
              {impact && (
                <p className="mt-2 text-sm font-medium text-blue">{favorableText(f, impact)}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
