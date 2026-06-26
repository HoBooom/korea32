import { signed } from "@/lib/format";
import type { TeamStanding } from "@/lib/types";

interface Props {
  group: string;
  standings: TeamStanding[];
  koreaId: number;
}

export default function GroupTable({ group, standings, koreaId }: Props) {
  return (
    <section className="rounded-[8px] border border-line bg-mist p-5 md:p-6">
      <div className="text-[12px] font-bold label-caps text-primary">Group Standings</div>
      <h2 className="mt-1 text-xl font-bold tracking-display text-ink">{group}조 순위</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-[12px] font-bold text-muted">
              <th className="py-2 pr-2">#</th>
              <th className="py-2 pr-2">팀</th>
              <th className="py-2 pr-2 text-right">경기</th>
              <th className="py-2 pr-2 text-right">승점</th>
              <th className="py-2 pr-2 text-right">득실</th>
              <th className="py-2 pr-2 text-right">득점</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s) => {
              const isKorea = s.team.id === koreaId;
              const advances = s.rank <= 2;
              return (
                <tr
                  key={s.team.id}
                  className={`border-t border-line ${isKorea ? "bg-sky" : ""}`}
                >
                  <td className="py-2.5 pr-2">
                    <span
                      className={`num-display inline-flex h-6 w-6 items-center justify-center text-sm font-bold ${
                        advances ? "text-blue" : "text-disabled"
                      }`}
                    >
                      {s.rank}
                    </span>
                  </td>
                  <td
                    className={`py-2.5 pr-2 ${
                      isKorea
                        ? "border-l-[3px] border-primary pl-2 font-bold text-navy"
                        : "text-body"
                    }`}
                  >
                    {s.team.name}
                    {isKorea && <span className="ml-1">🇰🇷</span>}
                  </td>
                  <td className="py-2.5 pr-2 text-right text-muted">{s.played}</td>
                  <td className="num-display py-2.5 pr-2 text-right text-base font-bold text-ink">
                    {s.points}
                  </td>
                  <td className="py-2.5 pr-2 text-right text-body">{signed(s.goalDiff)}</td>
                  <td className="py-2.5 pr-2 text-right text-body">{s.goalsFor}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[12px] text-muted">1·2위는 직행, 3위는 와일드카드 경쟁입니다.</p>
    </section>
  );
}
