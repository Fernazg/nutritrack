"use client";

import { useMemo, useState } from "react";
import { addDays, fromISODate } from "@/lib/date";
import { trendRatePerWeek, weightTrend, type TrendPoint } from "@/lib/nutrition/stats";
import { cn, formatNumber } from "@/lib/utils";
import type { WeightEntry } from "@/types/nutrition";

const shortFmt = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short" });

const RANGES = [
  { id: "30", label: "1 mes", days: 30 },
  { id: "90", label: "3 meses", days: 90 },
  { id: "all", label: "Todo", days: Infinity },
] as const;
type RangeId = (typeof RANGES)[number]["id"];

/**
 * Weight over time: each weigh-in as a dot and a smoothed trend line
 * (exponential moving average), so daily water swings don't hide the direction.
 * X is proportional to real dates.
 */
export function WeightChart({ entries, targetKg }: { entries: WeightEntry[]; targetKg?: number }) {
  const [range, setRange] = useState<RangeId>("90");
  const all = useMemo(() => weightTrend(entries), [entries]);
  const rate = trendRatePerWeek(all);
  const latest = all.at(-1);

  const days = RANGES.find((r) => r.id === range)!.days;
  const cutoff = latest && Number.isFinite(days) ? addDays(latest.date, -days) : null;
  const inRange = cutoff ? all.filter((p) => p.date >= cutoff) : all;
  const points = inRange.length >= 2 ? inRange : all;

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5" role="radiogroup" aria-label="Rango del gráfico">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={range === r.id}
            onClick={() => setRange(r.id)}
            className={cn(
              "rounded-full px-3 py-1 text-[13px] font-medium",
              range === r.id ? "bg-accent-soft text-accent" : "text-muted",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <Chart points={points} targetKg={targetKg} />

      <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-accent opacity-45" /> Pesajes
          </span>
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-3 rounded-full bg-accent" /> Tendencia
          </span>
        </span>
        {latest && (
          <span className="tabular">
            Tendencia {formatNumber(latest.trend, 1)} kg
            {rate !== null && ` · ${rate > 0 ? "+" : rate < 0 ? "−" : ""}${formatNumber(Math.abs(rate), 1)} kg/sem`}
          </span>
        )}
      </div>
    </div>
  );
}

function Chart({ points, targetKg }: { points: TrendPoint[]; targetKg?: number }) {
  const W = 320;
  const H = 160;
  const padX = 10;
  const padTop = 18;
  const padBottom = 22;

  const times = points.map((p) => fromISODate(p.date).getTime());
  const values = points.flatMap((p) => [p.weightKg, p.trend]);
  const all = targetKg ? [...values, targetKg] : values;
  const min = Math.min(...all) - 0.5;
  const max = Math.max(...all) + 0.5;
  const t0 = times[0];
  const span = Math.max(times.at(-1)! - t0, 1);

  const x = (t: number) => padX + ((t - t0) / span) * (W - padX * 2);
  const y = (v: number) => padTop + (1 - (v - min) / (max - min)) * (H - padTop - padBottom);
  const trendPath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(times[i])},${y(p.trend)}`).join(" ");
  const lastI = points.length - 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label={`Evolución del peso: ${formatNumber(points[0].weightKg, 1)} a ${formatNumber(points[lastI].weightKg, 1)} kg; tendencia ${formatNumber(points[lastI].trend, 1)} kg`}>
      {targetKg && (
        <>
          <line x1={padX} x2={W - padX} y1={y(targetKg)} y2={y(targetKg)}
            stroke="var(--muted)" strokeDasharray="4 4" strokeWidth={1} opacity={0.6} />
          <text x={W - padX} y={y(targetKg) - 5} textAnchor="end" fontSize={10} fill="var(--muted)">
            Meta {formatNumber(targetKg, 1)}
          </text>
        </>
      )}
      {points.map((p, i) => (
        <circle key={p.date} cx={x(times[i])} cy={y(p.weightKg)} r={2.6} fill="var(--accent)" opacity={0.45}>
          <title>{`${shortFmt.format(times[i])}: ${formatNumber(p.weightKg, 1)} kg`}</title>
        </circle>
      ))}
      <path d={trendPath} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(times[lastI])} cy={y(points[lastI].trend)} r={4.5} fill="var(--accent)" stroke="var(--surface)" strokeWidth={2} />
      <text x={padX} y={H - 5} fontSize={10} fill="var(--muted)">
        {shortFmt.format(times[0])}
      </text>
      <text x={W - padX} y={H - 5} fontSize={10} fill="var(--muted)" textAnchor="end">
        {shortFmt.format(times[lastI])}
      </text>
    </svg>
  );
}
