"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, PenLine, Utensils } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatLongDate } from "@/lib/date";
import { useFoodEntries } from "@/lib/db/hooks";
import { getMeal } from "@/lib/nutrition/meals";
import { sumTotals } from "@/lib/nutrition/totals";
import { useSelectedDate, withDate } from "@/lib/use-selected-date";
import { formatNumber } from "@/lib/utils";
import { SCAN_MODES } from "@/features/scanner/scan-modes";
import type { FoodEntry, MealType } from "@/types/nutrition";
import { FoodEntrySheet } from "./food-entry-sheet";

type Editing = { kind: "new" } | { kind: "edit"; entry: FoodEntry } | null;

export function MealDetail({ meal }: { meal: MealType }) {
  const config = getMeal(meal)!;
  const { date, today, isToday } = useSelectedDate();
  const entries = useFoodEntries(date)?.filter((e) => e.meal === meal);
  const totals = sumTotals(entries);
  const [editing, setEditing] = useState<Editing>(null);

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

      <section>
        <SectionTitle>Agregar alimento</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!date}
            onClick={() => setEditing({ kind: "new" })}
            className="flex items-center gap-3 rounded-2xl bg-accent p-4 text-white active:opacity-80"
          >
            <PenLine className="size-5" />
            <span className="text-[14px] font-semibold">Manual</span>
          </button>
          {SCAN_MODES.map(({ mode, short, icon: Icon }) => (
            <Link
              key={mode}
              href={`/escanear/${mode}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 active:bg-surface-2"
            >
              <Icon className="size-5 text-accent" />
              <span className="text-[14px] font-medium">{short}</span>
            </Link>
          ))}
        </div>
      </section>

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

      {editing && date && (
        <FoodEntrySheet
          date={date}
          meal={meal}
          entry={editing.kind === "edit" ? editing.entry : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
