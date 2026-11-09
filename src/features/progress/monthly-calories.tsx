"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { fromISODate, toISODate } from "@/lib/date";
import { useFoodEntriesRange } from "@/lib/db/hooks";
import { dailyTotals, summarizeDays } from "@/lib/nutrition/stats";
import { cn, formatNumber } from "@/lib/utils";
import type { Goals } from "@/types/nutrition";

const monthFmt = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" });
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

function monthDays(year: number, month: number): string[] {
  const n = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: n }, (_, i) => toISODate(new Date(year, month, i + 1)));
}

/**
 * Calendar of a month: each day shows the calories logged, with a neutral
 * tint proportional to the goal (no red/green judgement). Tap opens the diary.
 */
export function MonthlyCalories({ today, goals }: { today: string; goals: Goals }) {
  const t = fromISODate(today);
  const [offset, setOffset] = useState(0); // 0 = current month, −1 = previous…
  const first = new Date(t.getFullYear(), t.getMonth() + offset, 1);
  const dates = monthDays(first.getFullYear(), first.getMonth());
  const entries = useFoodEntriesRange(dates[0], dates.at(-1)!);
  const days = dailyTotals(entries ?? [], dates);
  const summary = summarizeDays(days, goals.calories);
  const lead = (first.getDay() + 6) % 7; // Monday-first grid
  const title = monthFmt.format(first);

  return (
    <section>
      <SectionTitle
        action={
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Mes anterior" onClick={() => setOffset((o) => o - 1)}
              className="flex size-8 items-center justify-center rounded-full text-accent active:bg-surface-2">
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" aria-label="Mes siguiente" disabled={offset >= 0} onClick={() => setOffset((o) => o + 1)}
              className="flex size-8 items-center justify-center rounded-full text-accent active:bg-surface-2 disabled:opacity-30">
              <ChevronRight className="size-5" />
            </button>
          </div>
        }
      >
        Calorías del mes
      </SectionTitle>
      <Card className="space-y-4">
        <p className="text-[15px] font-semibold first-letter:uppercase">{title}</p>
        <div className="grid grid-cols-7 gap-1 text-center" role="group" aria-label={`Calorías de ${title}`}>
          {WEEKDAYS.map((d, i) => (
            <span key={i} className="pb-1 text-[11px] font-medium text-muted">{d}</span>
          ))}
          {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
          {days.map((d) => {
            const future = d.date > today;
            const ratio = d.logged ? Math.min(d.calories / goals.calories, 1.3) : 0;
            const dayNum = Number(d.date.slice(8));
            const content = (
              <>
                <span className={cn("text-[12px] font-semibold", d.date === today && "text-accent")}>{dayNum}</span>
                <span className="tabular text-[10px] leading-none text-muted">
                  {d.logged ? formatNumber(d.calories) : future ? "" : "·"}
                </span>
                {d.logged && (
                  <span aria-hidden className="absolute inset-x-1.5 bottom-1 h-1 overflow-hidden rounded-full bg-surface-2">
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${(ratio / 1.3) * 100}%`, opacity: 0.4 + ratio * 0.45 }} />
                  </span>
                )}
              </>
            );
            const cls = cn(
              "relative flex h-12 flex-col items-center justify-start gap-0.5 rounded-xl pt-1.5",
              d.date === today ? "ring-1 ring-accent" : "",
              d.logged ? "bg-accent-soft/40" : "",
            );
            const label = `${dayNum}: ${d.logged ? `${formatNumber(d.calories)} kcal` : "sin registro"}`;
            return future ? (
              <span key={d.date} className={cn(cls, "opacity-35")} aria-label={label}>{content}</span>
            ) : (
              <Link key={d.date} href={d.date === today ? "/diario" : `/diario?fecha=${d.date}`}
                className={cn(cls, "active:bg-surface-2")} aria-label={label}>
                {content}
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
          <Kpi label="Promedio" value={summary.daysLogged ? formatNumber(summary.avgCalories) : "—"} unit="kcal" />
          <Kpi label="Días registrados" value={`${summary.daysLogged}`} />
          <Kpi label="Cerca de la meta" value={summary.daysLogged ? `${summary.onTarget}` : "—"} unit={summary.daysLogged ? "días" : ""} />
        </div>
        <p className="text-[12px] text-muted">
          El promedio considera solo los días con registro. La barra de cada día compara con tu meta de {formatNumber(goals.calories)} kcal.
        </p>
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
