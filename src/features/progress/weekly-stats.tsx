"use client";

import { Card, SectionTitle } from "@/components/ui/card";
import { MACRO_META } from "@/components/ui/macro-bar";
import { addDays, fromISODate } from "@/lib/date";
import { useFoodEntriesRange } from "@/lib/db/hooks";
import { averageLogged, dailyTotals, daysOnTarget, macroEnergySplit, type DayTotals } from "@/lib/nutrition/stats";
import { formatNumber } from "@/lib/utils";
import type { Goals } from "@/types/nutrition";

const dayFmt = new Intl.DateTimeFormat("es-CL", { weekday: "narrow" });

/** Last 7 days vs the 7 before. Neutral visuals: no red/green judgement per day. */
export function WeeklyStats({ today, goals }: { today: string; goals: Goals }) {
  const from = addDays(today, -13);
  const entries = useFoodEntriesRange(from, today);
  const dates = Array.from({ length: 14 }, (_, i) => addDays(from, i));
  const all = dailyTotals(entries ?? [], dates);
  const prev = all.slice(0, 7);
  const week = all.slice(7);
  const avg = averageLogged(week);
  const prevAvg = averageLogged(prev);
  const split = macroEnergySplit(avg);
  const onTarget = daysOnTarget(week, goals.calories);

  return (
    <section>
      <SectionTitle>Últimos 7 días</SectionTitle>
      <Card className="space-y-5">
        <CaloriesChart days={week} goal={goals.calories} />

        <div className="grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
          <Kpi label="Promedio" value={avg.daysLogged ? formatNumber(avg.calories) : "—"} unit="kcal" />
          <Kpi label="Días registrados" value={`${avg.daysLogged}/7`} />
          <Kpi label="Cerca de la meta" value={avg.daysLogged ? `${onTarget}` : "—"} unit={avg.daysLogged ? "días" : ""} />
        </div>

        {avg.daysLogged > 0 && prevAvg.daysLogged > 0 && (
          <p className="rounded-2xl bg-surface-2 px-3 py-2 text-[13px] text-muted">
            Semana anterior: {formatNumber(prevAvg.calories)} kcal promedio
            {" · "}
            {avg.calories === prevAvg.calories
              ? "sin cambios"
              : `${avg.calories > prevAvg.calories ? "+" : "−"}${formatNumber(Math.abs(avg.calories - prevAvg.calories))} kcal esta semana`}
            .
          </p>
        )}

        {avg.daysLogged > 0 && (
          <div>
            <p className="mb-2 text-[13px] font-semibold text-muted">Proteína promedio</p>
            <div className="flex items-baseline justify-between">
              <p className="tabular text-[20px] font-semibold">
                {formatNumber(avg.protein)} g
                <span className="ml-1 text-[13px] font-medium text-muted">de {formatNumber(goals.protein)} g</span>
              </p>
            </div>
            <p className="mt-4 mb-2 text-[13px] font-semibold text-muted">Energía por macronutriente</p>
            <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
              {(["protein", "carbs", "fat"] as const).map((k) => (
                <span key={k} style={{ width: `${split[k]}%`, background: MACRO_META[k].color }} />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[12px] text-muted">
              {(["protein", "carbs", "fat"] as const).map((k) => (
                <span key={k} className="flex items-center gap-1">
                  <span className="size-2 rounded-full" style={{ background: MACRO_META[k].color }} />
                  {MACRO_META[k].label} {split[k]}%
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}

function Kpi({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <p className="tabular text-[18px] font-semibold">
        {value}
        {unit && <span className="ml-0.5 text-[11px] font-medium text-muted">{unit}</span>}
      </p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}

function CaloriesChart({ days, goal }: { days: DayTotals[]; goal: number }) {
  const W = 320;
  const H = 140;
  const top = 14;
  const bottom = 20;
  const max = Math.max(goal * 1.25, ...days.map((d) => d.calories));
  const slot = W / days.length;
  const barW = slot * 0.5;
  const y = (v: number) => top + (1 - v / max) * (H - top - bottom);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label={`Calorías de los últimos 7 días; meta ${goal} kcal`}>
      <line x1={0} x2={W} y1={y(goal)} y2={y(goal)} stroke="var(--muted)" strokeDasharray="4 4" strokeWidth={1} opacity={0.6} />
      <text x={W} y={y(goal) - 4} textAnchor="end" fontSize={10} fill="var(--muted)">
        Meta {formatNumber(goal)}
      </text>
      {days.map((d, i) => {
        const x = i * slot + (slot - barW) / 2;
        const h = Math.max(y(0) - y(d.calories), d.logged ? 3 : 0);
        const isToday = i === days.length - 1;
        return (
          <g key={d.date}>
            <title>{d.logged ? `${formatNumber(d.calories)} kcal` : "Sin registro"}</title>
            {d.logged ? (
              <rect x={x} y={y(0) - h} width={barW} height={h} rx={5}
                fill="var(--accent)" opacity={isToday ? 1 : 0.55} />
            ) : (
              <rect x={x} y={y(0) - 3} width={barW} height={3} rx={1.5} fill="var(--surface-2)" />
            )}
            <text x={x + barW / 2} y={H - 4} textAnchor="middle" fontSize={11}
              fill={isToday ? "var(--text)" : "var(--muted)"} fontWeight={isToday ? 600 : 400}>
              {dayFmt.format(fromISODate(d.date)).toUpperCase()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
