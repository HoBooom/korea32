import { formatPercent } from "@/lib/format";
import type { QualificationStatus } from "@/lib/types";

interface Props {
  status: QualificationStatus;
  ratio: number;
  conditions: string[];
  koreaGroup: string | null;
}

const STATUS_META: Record<QualificationStatus, { label: string; cls: string }> = {
  IN: { label: "32강 진출 확정", cls: "bg-primary text-on-primary" },
  OUT: { label: "진출 무산", cls: "bg-cloud text-muted" },
  CONTENDS: { label: "경우의 수 다툼 중", cls: "bg-navy text-on-primary" },
};

export default function KoreaStatus({ status, ratio, conditions, koreaGroup }: Props) {
  const meta = STATUS_META[status];
  const headline = conditions[0] ?? "";

  return (
    <section className="rounded-[8px] border border-line bg-mist p-6 md:p-8">
      <div className="text-[12px] font-bold label-caps text-primary">Qualification</div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center rounded-[4px] px-3 py-1 text-[12px] font-bold ${meta.cls}`}>
          {meta.label}
        </span>
        {koreaGroup && (
          <span className="inline-flex items-center rounded-[4px] bg-cloud px-3 py-1 text-[12px] font-bold text-navy">
            {koreaGroup}조
          </span>
        )}
      </div>

      <div className="mt-6 flex items-end gap-4">
        <div>
          <div className="text-[13px] font-medium text-muted">
            실시간 예상 진출 확률 · FIFA 랭킹 기반
          </div>
          <div className="num-display mt-1 text-6xl font-extrabold leading-none text-primary md:text-7xl">
            {formatPercent(ratio)}
          </div>
        </div>
      </div>

      <p className="mt-5 max-w-3xl text-xl font-bold tracking-display text-ink md:text-2xl">
        {headline}
      </p>

      {conditions.length > 1 && (
        <ul className="mt-4 space-y-1.5 border-t border-line pt-4">
          {conditions.slice(1).map((c, i) => (
            <li key={i} className="text-[15px] leading-relaxed text-body">
              · {c}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
