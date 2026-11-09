"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { addDays, formatLongDate } from "@/lib/date";
import { useFoodEntries, useGoals } from "@/lib/db/hooks";
import { sumTotals } from "@/lib/nutrition/totals";
import { useSelectedDate, withDate } from "@/lib/use-selected-date";
import { formatNumber } from "@/lib/utils";
import { MealSummaryList } from "./meal-summary-list";
import { ActivitySection } from "@/features/activity/activity-section";

export function Diary() {
  const router = useRouter();
  const { date, today, isToday } = useSelectedDate();
  const entries = useFoodEntries(date);
  const goals = useGoals();
  const totals = sumTotals(entries);

  const yesterday = today ? addDays(today, -1) : null;
  const label = !date ? " " : isToday ? "Hoy" : date === yesterday ? "Ayer" : formatLongDate(date);

  function go(days: number) {
    if (!date) return;
    router.replace(withDate("/diario", addDays(date, days), today), { scroll: false });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Diario" />

      <div className="flex items-center justify-between rounded-full border border-border bg-surface p-1">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Día anterior"
          className="flex size-10 items-center justify-center rounded-full active:bg-surface-2"
        >
          <ChevronLeft className="size-5" />
        </button>
        <span className="text-[15px] font-semibold">{label}</span>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={isToday}
          aria-label="Día siguiente"
          className="flex size-10 items-center justify-center rounded-full active:bg-surface-2 disabled:opacity-30"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <Card className="grid grid-cols-4 gap-2 p-4 text-center">
        <Total label="kcal" value={totals.calories} goal={goals.calories} />
        <Total label="Prot." value={totals.protein} goal={goals.protein} color="var(--protein)" />
        <Total label="Carb." value={totals.carbs} goal={goals.carbs} color="var(--carbs)" />
        <Total label="Grasa" value={totals.fat} goal={goals.fat} color="var(--fat)" />
      </Card>

      <MealSummaryList
        entries={entries}
        hrefFor={(meal) => withDate(`/diario/${meal}`, date, today)}
      />

      <ActivitySection date={date} />
    </div>
  );
}

function Total({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  color?: string;
}) {
  return (
    <div>
      <p className="tabular text-[17px] font-semibold" style={color ? { color } : undefined}>
        {formatNumber(value)}
      </p>
      <p className="tabular text-[11px] text-muted">
        de {formatNumber(goal)} · {label}
      </p>
    </div>
  );
}
