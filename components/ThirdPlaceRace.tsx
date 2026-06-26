import { signed } from "@/lib/format";
import { THIRD_PLACE_SLOTS } from "@/lib/thirdPlace";
import type { ThirdPlaceEntry } from "@/lib/types";

type RankedEntry = ThirdPlaceEntry & { position: number; qualifies: boolean };

interface Props {
  ranking: RankedEntry[];
  koreaId: number;
}

export default function ThirdPlaceRace({ ranking, koreaId }: Props) {
  return (
    <section className="rounded-[8px] border border-line bg-mist p-5 md:p-6">
      <div className="text-[12px] font-bold label-caps text-primary">Third Place Race</div>
      <h2 className="mt-1 text-xl font-bold tracking-display text-ink">실시간 조 3위 순위</h2>
      <p className="mt-1 text-[13px] text-muted">
        12개 조 3위 팀 중 상위 {THIRD_PLACE_SLOTS}팀이 32강에 진출합니다.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-[12px] font-bold text-muted">
              <th className="py-2 pr-2">#</th>
              <th className="py-2 pr-2">조</th>
              <th className="py-2 pr-2">팀</th>
              <th className="py-2 pr-2 text-right">승점</th>
              <th className="py-2 pr-2 text-right">득실</th>
              <th className="py-2 pr-2 text-right">득점</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((e) => {
              const isKorea = e.team.id === koreaId;
              const cutBelow = e.position === THIRD_PLACE_SLOTS;
              return (
                <tr
                  key={e.team.id}
                  className={[
                    "border-t border-line",
                    cutBelow ? "border-b-2 border-b-primary" : "",
                    isKorea ? "bg-sky" : "",
                  ].join(" ")}
                >
                  <td className="py-2.5 pr-2">
                    <span
                      className={`num-display inline-flex h-6 w-6 items-center justify-center text-sm font-bold ${
                        e.qualifies ? "text-blue" : "text-disabled"
                      }`}
                    >
                      {e.position}
                    </span>
                  </td>
                  <td className="py-2.5 pr-2 text-muted">{e.group}</td>
                  <td
                    className={`py-2.5 pr-2 ${
                      isKorea
                        ? "border-l-[3px] border-primary pl-2 font-bold text-navy"
                        : "text-body"
                    }`}
                  >
                    {e.team.name}
                    {isKorea && <span className="ml-1">🇰🇷</span>}
                  </td>
                  <td className="num-display py-2.5 pr-2 text-right text-base font-bold text-ink">
                    {e.points}
                  </td>
                  <td className="py-2.5 pr-2 text-right text-body">{signed(e.goalDiff)}</td>
                  <td className="py-2.5 pr-2 text-right text-body">{e.goalsFor}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[12px] text-muted">붉은 가로선 아래는 현재 기준 진출권 밖입니다.</p>
    </section>
  );
}
