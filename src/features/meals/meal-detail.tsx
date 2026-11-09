"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Copy, Plus, Utensils } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { addDays, formatLongDate } from "@/lib/date";
import { useFoodEntries } from "@/lib/db/hooks";
import { copyMeal } from "@/lib/db/repository";
import { getMeal } from "@/lib/nutrition/meals";
import { sumTotals } from "@/lib/nutrition/totals";
import { useSelectedDate, withDate } from "@/lib/use-selected-date";
import { formatNumber } from "@/lib/utils";
import { SCAN_MODES } from "@/features/scanner/scan-modes";
import { AddFoodSheet } from "@/features/foods/add-food-sheet";
import type { FoodEntry, MealType } from "@/types/nutrition";
import { FoodEntrySheet } from "./food-entry-sheet";

type Editing =
  | { kind: "search" }
  | { kind: "manual"; name: string }
  | { kind: "edit"; entry: FoodEntry }
  | null;

export function MealDetail({ meal }: { meal: MealType }) {
  const config = getMeal(meal)!;
  const { date, today, isToday } = useSelectedDate();
  const entries = useFoodEntries(date)?.filter((e) => e.meal === meal);
  const previousDay = date ? addDays(date, -1) : null;
  const previous = useFoodEntries(previousDay)?.filter((e) => e.meal === meal);
  const totals = sumTotals(entries);
  const [editing, setEditing] = useState<Editing>(null);
  const [copying, setCopying] = useState(false);

  async function repeatPrevious() {
    if (!date || !previousDay || copying) return;
    setCopying(true);
    try {
      await copyMeal(previousDay, date, meal);
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={config.label}
        backHref={withDate("/diario", date, today)}
        subtitle={
          <>
            {date && !isToday && <span className="block">{formatLongDate(date)}</span>}
            <span className="tabular">
              {formatNumber(totals.calories)} kcal · P {formatNumber(totals.protein)} g · C{" "}
              {formatNumber(totals.carbs)} g · G {formatNumber(totals.fat)} g
            </span>
          </>
        }
      />

      <button
        type="button"
        disabled={!date}
        onClick={() => setEditing({ kind: "search" })}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-4 text-[16px] font-semibold text-white shadow-sm shadow-accent/20 active:scale-[0.99] active:opacity-90 disabled:opacity-50"
      >
        <Plus className="size-5" strokeWidth={2.5} /> Agregar alimento
      </button>

      {entries && entries.length === 0 && previous && previous.length > 0 && (
        <button
          type="button"
          onClick={repeatPrevious}
          disabled={copying}
          className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-4 py-3 text-left active:bg-surface-2 disabled:opacity-50"
        >
          <Copy className="size-5 shrink-0 text-accent" />
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold">Repetir {config.label.toLowerCase()} del día anterior</span>
            <span className="block truncate text-[12px] text-muted">
              {previous.map((e) => e.name).join(", ")} · {formatNumber(sumTotals(previous).calories)} kcal
            </span>
          </span>
        </button>
      )}

      <section>
        <SectionTitle>Alimentos</SectionTitle>
        <Card className="p-0">
          {entries && entries.length > 0 ? (
            <ul className="divide-y divide-border">
              {entries.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setEditing({ kind: "edit", entry: e })}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-left active:bg-surface-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium">{e.name}</p>
                      <p className="tabular truncate text-[12px] text-muted">
                        {e.quantity ? `${e.quantity} · ` : ""}P {formatNumber(e.protein)} · C{" "}
                        {formatNumber(e.carbs)} · G {formatNumber(e.fat)}
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-[14px] font-semibold">
                      {formatNumber(e.calories)} kcal
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Utensils}
              title="Aún no hay alimentos"
              description={`Lo que registres en ${config.label.toLowerCase()} aparecerá aquí.`}
            />
          )}
        </Card>
      </section>

      <section>
        <SectionTitle>Otras formas de registrar</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {SCAN_MODES.map(({ mode, short, icon: Icon }) => (
            <Link
              key={mode}
              href={`/escanear/${mode}`}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface py-3 active:bg-surface-2"
            >
              <Icon className="size-5 text-accent" />
              <span className="text-[13px] font-medium">{short}</span>
            </Link>
          ))}
        </div>
      </section>

      {editing?.kind === "search" && date && (
        <AddFoodSheet
          date={date}
          meal={meal}
          onClose={() => setEditing(null)}
          onCreateManual={(name) => setEditing({ kind: "manual", name })}
        />
      )}
      {(editing?.kind === "manual" || editing?.kind === "edit") && date && (
        <FoodEntrySheet
          date={date}
          meal={meal}
          entry={editing.kind === "edit" ? editing.entry : undefined}
          initialName={editing.kind === "manual" ? editing.name : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
