"use client";

import { MEALS } from "@/lib/nutrition/meals";
import { cn } from "@/lib/utils";
import type { MealType } from "@/types/nutrition";

/** Segmented control to choose the meal an entry belongs to. */
export function MealPicker({ value, onChange }: { value: MealType; onChange: (m: MealType) => void }) {
  return (
    <div className="grid grid-cols-5 gap-1 rounded-2xl bg-surface-2 p-1" role="radiogroup" aria-label="Comida">
      {MEALS.map((m) => (
        <button
          key={m.type}
          type="button"
          role="radio"
          aria-checked={value === m.type}
          onClick={() => onChange(m.type)}
          className={cn(
            "truncate rounded-xl px-0.5 py-2 text-[12px] font-medium transition-colors",
            value === m.type ? "bg-surface text-text shadow-sm" : "text-muted",
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
