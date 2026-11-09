"use client";

import Link from "next/link";
import { ChevronRight, Scale } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { CalorieRing } from "@/components/ui/calorie-ring";
import { MacroBar } from "@/components/ui/macro-bar";
import { useFoodEntries, useGoals, useWeightEntries } from "@/lib/db/hooks";
import { formatLongDate, greeting, useToday } from "@/lib/date";
import { sumTotals } from "@/lib/nutrition/totals";
import { formatNumber } from "@/lib/utils";
import { MealSummaryList } from "@/features/meals/meal-summary-list";
import { QuickActions } from "@/features/scanner/quick-actions";

export function Dashboard() {
  const today = useToday();
  const goals = useGoals();
  const entries = useFoodEntries(today);
  const weights = useWeightEntries();
  const totals = sumTotals(entries);
  const lastWeight = weights?.at(-1);

  return (
    <div className="space-y-6">
      <header className="pt-safe">
        <p className="pt-4 text-[13px] font-medium text-muted" suppressHydrationWarning>
          {today ? formatLongDate(today) : " "}
        </p>
        <h1 className="mt-0.5 text-[30px] leading-tight font-bold tracking-tight">
          {today ? greeting(new Date().getHours()) : "Hola"}
        </h1>
      </header>

      <Card className="p-6">
        <div className="flex items-center gap-5">
          <CalorieRing consumed={totals.calories} goal={goals.calories} size={148} />
          <dl className="flex-1 space-y-4">
            <Stat label="Consumidas" value={totals.calories} />
            <Stat label="Meta diaria" value={goals.calories} />
          </dl>
        </div>
        <div className="mt-6 flex gap-4 border-t border-border pt-5">
          <MacroBar macro="protein" value={totals.protein} goal={goals.protein} />
          <MacroBar macro="carbs" value={totals.carbs} goal={goals.carbs} />
          <MacroBar macro="fat" value={totals.fat} goal={goals.fat} />
        </div>
      </Card>

      <section>
        <SectionTitle>Registrar con</SectionTitle>
        <QuickActions />
      </section>

      <section>
        <SectionTitle
          action={
            <Link href="/diario" className="text-[14px] font-medium text-accent">
              Ver diario
            </Link>
          }
        >
          Comidas de hoy
        </SectionTitle>
        <MealSummaryList entries={entries} />
      </section>

      <Link href="/progreso" className="block active:opacity-70">
        <Card className="flex items-center gap-4">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Scale className="size-5" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] text-muted">Peso actual</p>
            <p className="tabular text-[17px] font-semibold">
              {lastWeight ? `${formatNumber(lastWeight.weightKg, 1)} kg` : "Sin registros"}
            </p>
          </div>
          <ChevronRight className="size-5 text-muted" />
        </Card>
      </Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="tabular text-[22px] leading-tight font-semibold tracking-tight">
        {formatNumber(value)}
        <span className="ml-1 text-[13px] font-medium text-muted">kcal</span>
      </dd>
    </div>
  );
}
