import {
  addDaysKey,
  dayOfMonth,
  formatDateKeyLabel,
  formatKSTTime,
  kstDateKey,
  todayKSTKey,
  weekdayShort,
} from "@/lib/format";
import { curatedRuleFor, curatedSatisfied, curatedLabel } from "@/lib/curatedFavor";
import type { FinishedImpact } from "@/lib/finishedImpact";
import type { Fixture, MatchImpact } from "@/lib/types";

/** Days ahead of today to include (today + this many). */
const WINDOW_AHEAD = 3;

interface Props {
  fixtures: Fixture[];
  impacts: Record<number, MatchImpact>;
  finishedImpacts: Record<number, FinishedImpact>;
  koreaId: number;
}

type Relation = "good" | "bad" | "neutral" | "watch";

function Flag({ url, alt }: { url?: string; alt: string }) {
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} width={22} height={15} className="inline-block rounded-[2px]" />;
}

function RelationBadge({ relation, text }: { relation: Relation; text: string }) {
  const cls =
    relation === "good"
      ? "bg-blue text-on-primary"
      : relation === "bad"
        ? "bg-primary text-on-primary"
        : relation === "watch"
          ? "border border-blue text-blue"
          : "bg-cloud text-muted";
  const mark = relation === "good" ? "O " : relation === "bad" ? "X " : "";
  return (
    <span
      className={`whitespace-nowrap rounded-[4px] px-2.5 py-1 text-[12px] font-bold ${cls}`}
    >
      {mark}
      {text}
    </span>
  );
}

function statusCell(f: Fixture) {
  const hasScore = f.homeGoals != null && f.awayGoals != null;
  if (f.phase === "finished")
    return (
      <div className="text-center">
        <div className="num-display text-2xl font-extrabold leading-none text-ink">
          {f.homeGoals} <span className="text-disabled">:</span> {f.awayGoals}
        </div>
        <div className="mt-0.5 text-[11px] text-muted">경기종료</div>
      </div>
    );
  if (f.phase === "live")
    return (
      <div className="text-center">
        <div className="num-display text-2xl font-extrabold leading-none text-ink">
          {hasScore ? `${f.homeGoals} : ${f.awayGoals}` : "0 : 0"}
        </div>
        <div className="mt-0.5 inline-block rounded-[2px] bg-live px-1.5 text-[11px] font-bold text-on-primary">
          LIVE
        </div>
      </div>
    );
  return (
    <div className="text-center">
      <div className="num-display text-lg font-bold leading-none text-navy">
        {formatKSTTime(f.kickoff)}
      </div>
      <div className="mt-0.5 text-[11px] text-muted">예정</div>
    </div>
  );
}

export default function TodayMatches({ fixtures, koreaId }: Props) {
  const today = todayKSTKey();
  const windowKeys = Array.from({ length: WINDOW_AHEAD + 1 }, (_, i) => addDaysKey(today, i));
  const windowSet = new Set(windowKeys);

  const scheduled = fixtures
    .filter((f) => windowSet.has(kstDateKey(f.kickoff)))
    .sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff));

  const byDate = new Map<string, Fixture[]>();
  for (const f of scheduled) {
    const k = kstDateKey(f.kickoff);
    (byDate.get(k) ?? byDate.set(k, []).get(k)!).push(f);
  }

  // Only the curated 9 matches carry a Korea impact. Every other match is
  // explicitly "상관없음" — the computed engine no longer drives the schedule.
  const relationOf = (
    f: Fixture,
  ): { relation: Relation; badge: string; note?: string } => {
    const rule = curatedRuleFor(f.home.code, f.away.code);
    if (!rule) return { relation: "neutral", badge: "상관없음" };

    if (f.phase === "finished" && f.homeGoals != null && f.awayGoals != null) {
      const ok = curatedSatisfied(rule, f.home.code!, f.homeGoals, f.awayGoals);
      return ok
        ? { relation: "good", badge: "한국 유리" }
        : { relation: "bad", badge: "한국 불리" };
    }
    return { relation: "watch", badge: "유리 조건", note: curatedLabel(rule) };
  };

  return (
    <section>
      <div className="text-[12px] font-bold label-caps text-primary">Schedule</div>
      <h2 className="mt-1 text-2xl font-bold tracking-display text-ink">남은 경기 일정</h2>
      <p className="mt-1 text-[14px] text-muted">
        오늘부터 {WINDOW_AHEAD}일간의 조별리그 일정과, 각 경기의 한국 유·불리를 표시합니다.
      </p>

      {/* Date strip */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {windowKeys.map((k) => {
          const isToday = k === today;
          const has = byDate.has(k);
          return (
            <div
              key={k}
              className={`flex min-w-[54px] flex-col items-center gap-0.5 rounded-[4px] px-3 py-2 ${
                isToday
                  ? "bg-navy text-on-primary"
                  : "border border-line bg-mist text-body"
              }`}
            >
              <span className="text-[11px] font-bold">{weekdayShort(k)}</span>
              <span className="num-display text-lg font-extrabold leading-none">
                {dayOfMonth(k)}
              </span>
              <span
                className={`h-1 w-1 rounded-full ${
                  has ? (isToday ? "bg-on-primary" : "bg-primary") : "bg-transparent"
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Grouped schedule */}
      <div className="mt-5 flex flex-col gap-5">
        {windowKeys
          .filter((k) => byDate.has(k))
          .map((k) => (
            <div key={k} className="overflow-hidden rounded-[8px] border border-line bg-mist">
              <div className="flex items-center gap-2 border-b border-line bg-cloud px-4 py-3">
                <h3 className="text-[15px] font-bold text-navy">{formatDateKeyLabel(k)}</h3>
                {k === today && (
                  <span className="rounded-[2px] bg-primary px-2 py-0.5 text-[11px] font-bold text-on-primary">
                    오늘
                  </span>
                )}
              </div>

              <div className="divide-y divide-line">
                {byDate.get(k)!.map((f) => {
                  const isKorea = f.home.id === koreaId || f.away.id === koreaId;
                  const { relation, badge, note } = relationOf(f);
                  return (
                    <div
                      key={f.id}
                      className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3 sm:grid-cols-[1fr_92px_1fr_120px_140px] ${
                        isKorea ? "bg-sky" : ""
                      }`}
                    >
                      {/* Home */}
                      <div className="flex items-center justify-end gap-2 text-right">
                        <span className="font-bold text-ink">{f.home.name}</span>
                        <Flag url={f.home.logo} alt={f.home.name} />
                      </div>
                      {/* Score / status */}
                      <div className="px-2">{statusCell(f)}</div>
                      {/* Away */}
                      <div className="flex items-center gap-2">
                        <Flag url={f.away.logo} alt={f.away.name} />
                        <span className="font-bold text-ink">{f.away.name}</span>
                      </div>
                      {/* Group / matchday (desktop) */}
                      <div className="hidden text-[12px] font-medium text-muted sm:block">
                        {f.group}조{f.matchday ? ` ${f.matchday}차전` : ""}
                        {isKorea && " · 🇰🇷"}
                      </div>
                      {/* Relation badge + optional condition note */}
                      <div className="col-span-3 flex flex-col items-center gap-1 sm:col-span-1 sm:items-end">
                        <RelationBadge relation={relation} text={badge} />
                        {note && (
                          <span className="text-[11px] font-medium leading-tight text-blue sm:text-right">
                            {note}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

        {byDate.size === 0 && (
          <p className="rounded-[8px] border border-line bg-mist p-4 text-sm text-muted">
            앞으로 {WINDOW_AHEAD}일간 예정된 조별리그 경기가 없습니다.
          </p>
        )}
      </div>
    </section>
  );
}
