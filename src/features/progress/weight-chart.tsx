import { fromISODate } from "@/lib/date";
import { formatNumber } from "@/lib/utils";
import type { WeightEntry } from "@/types/nutrition";

const shortFmt = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short" });

/**
 * Minimal dependency-free line chart for weight over time.
 * X is proportional to real dates, so gaps between weigh-ins are visible.
 */
export function WeightChart({ entries, targetKg }: { entries: WeightEntry[]; targetKg?: number }) {
  const W = 320;
  const H = 150;
  const padX = 10;
  const padTop = 18;
  const padBottom = 22;

  const times = entries.map((e) => fromISODate(e.date).getTime());
  const values = entries.map((e) => e.weightKg);
  const all = targetKg ? [...values, targetKg] : values;
  const min = Math.min(...all) - 0.5;
  const max = Math.max(...all) + 0.5;
  const t0 = times[0];
  const span = Math.max(times.at(-1)! - t0, 1);

  const x = (t: number) => padX + ((t - t0) / span) * (W - padX * 2);
  const y = (v: number) => padTop + (1 - (v - min) / (max - min)) * (H - padTop - padBottom);
  const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(times[i])},${y(v)}`).join(" ");
  const lastI = values.length - 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Evolución del peso">
      {targetKg && (
        <>
          <line x1={padX} x2={W - padX} y1={y(targetKg)} y2={y(targetKg)}
            stroke="var(--muted)" strokeDasharray="4 4" strokeWidth={1} opacity={0.6} />
          <text x={W - padX} y={y(targetKg) - 5} textAnchor="end" fontSize={10} fill="var(--muted)">
            Meta {formatNumber(targetKg, 1)}
          </text>
        </>
      )}
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => (
        <circle key={entries[i].id ?? i} cx={x(times[i])} cy={y(v)} r={i === lastI ? 4.5 : 3}
          fill={i === lastI ? "var(--accent)" : "var(--surface)"} stroke="var(--accent)" strokeWidth={2} />
      ))}
      <text x={padX} y={H - 5} fontSize={10} fill="var(--muted)">
        {shortFmt.format(times[0])}
      </text>
      <text x={W - padX} y={H - 5} fontSize={10} fill="var(--muted)" textAnchor="end">
        {shortFmt.format(times[lastI])}
      </text>
    </svg>
  );
}
