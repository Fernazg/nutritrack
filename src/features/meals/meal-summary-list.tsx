import Link from "next/link";
import { Plus } from "lucide-react";
import { MEALS } from "@/lib/nutrition/meals";
import { sumTotals } from "@/lib/nutrition/totals";
import { formatNumber } from "@/lib/utils";
import type { FoodEntry, MealType } from "@/types/nutrition";

interface MealSummaryListProps {
  entries: FoodEntry[] | undefined;
  /** Builds the link for each meal (lets the diary carry the selected date). */
  hrefFor?: (meal: MealType) => string;
}

/** Compact list of the four daily meals with their calorie subtotal. */
export function MealSummaryList({ entries, hrefFor }: MealSummaryListProps) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-surface">
      {MEALS.map((meal) => {
        const items = entries?.filter((e) => e.meal === meal.type) ?? [];
        const kcal = sumTotals(items).calories;
        const Icon = meal.icon;
        return (
          <li key={meal.type}>
            <Link
              href={hrefFor ? hrefFor(meal.type) : `/diario/${meal.type}`}
              className="flex items-center gap-4 px-5 py-4 active:bg-surface-2"
            >
              <div className="flex size-10 items-center justify-center rounded-2xl bg-surface-2 text-text">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">{meal.label}</p>
                <p className="truncate text-[13px] text-muted">
                  {items.length > 0 ? items.map((i) => i.name).join(", ") : meal.hint}
                </p>
              </div>
              {kcal > 0 && (
                <span className="tabular shrink-0 text-[14px] font-semibold">
                  {formatNumber(kcal)} <span className="font-medium text-muted">kcal</span>
                </span>
              )}
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Plus className="size-4" strokeWidth={2.5} />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
