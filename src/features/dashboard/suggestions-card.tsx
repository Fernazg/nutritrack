"use client";

import { useState } from "react";
import { Lightbulb, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Sheet, SheetAction } from "@/components/ui/sheet";
import { useSavedFoods } from "@/lib/db/hooks";
import { mealForHour } from "@/lib/nutrition/meals";
import { suggestFromSaved } from "@/lib/nutrition/suggest";
import type { FoodCandidate } from "@/lib/nutrition/portion";
import { formatNumber } from "@/lib/utils";
import type { NutritionTotals } from "@/types/nutrition";
import { PortionForm } from "@/features/foods/portion-form";

const FORM_ID = "suggestion-portion";

/** Quick picks from the user's own foods that fit what's left today. Rule-based, not AI. */
export function SuggestionsCard({ date, remaining }: { date: string | null; remaining: NutritionTotals }) {
  const saved = useSavedFoods();
  const [picked, setPicked] = useState<FoodCandidate | null>(null);
  const suggestions = saved ? suggestFromSaved(saved, remaining) : [];
  if (!date || suggestions.length === 0) return null;
  const proteinFocus = suggestions[0].reason === "protein";

  return (
    <>
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Lightbulb className="size-4 text-carbs" />
          <p className="text-[15px] font-semibold">Para completar tu día</p>
        </div>
        <p className="mb-3 text-[13px] text-muted">
          {proteinFocus
            ? `De tus alimentos, los que más proteína aportan dentro de las ${formatNumber(remaining.calories)} kcal que te quedan.`
            : `De tus alimentos habituales que caben en las ${formatNumber(remaining.calories)} kcal que te quedan.`}
        </p>
        <ul className="space-y-2">
          {suggestions.map(({ food, nutrition }) => (
            <li key={food.key ?? food.name}>
              <button
                type="button"
                onClick={() => setPicked(food)}
                className="flex w-full items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-left active:opacity-70"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{food.name}</span>
                  <span className="tabular block text-[12px] text-muted">
                    {formatNumber(nutrition.calories)} kcal · {formatNumber(nutrition.protein)} g proteína
                  </span>
                </span>
                <Plus className="size-4 shrink-0 text-accent" strokeWidth={2.5} />
              </button>
            </li>
          ))}
        </ul>
      </Card>
      {picked && (
        <Sheet title="Agregar alimento" onClose={() => setPicked(null)} action={<SheetAction form={FORM_ID}>Agregar</SheetAction>}>
          <PortionForm
            food={picked}
            date={date}
            meal={mealForHour(new Date().getHours())}
            formId={FORM_ID}
            onSaved={() => setPicked(null)}
          />
        </Sheet>
      )}
    </>
  );
}
