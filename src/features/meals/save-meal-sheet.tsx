"use client";

import { useState } from "react";
import { Sheet, SheetAction } from "@/components/ui/sheet";
import { FieldGroup, TextRow } from "@/components/ui/field";
import { setFavorite, touchFood } from "@/lib/db/repository";
import { sumTotals } from "@/lib/nutrition/totals";
import { formatNumber } from "@/lib/utils";
import type { FoodEntry } from "@/types/nutrition";

const FORM_ID = "save-meal-form";

/**
 * Saves the current meal's entries as one reusable food ("comida personalizada"),
 * marked as favorite so it can be logged again in one tap.
 */
export function SaveMealSheet({
  entries,
  defaultName,
  onClose,
}: {
  entries: FoodEntry[];
  defaultName: string;
  onClose: () => void;
}) {
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState<string | null>(null);
  const totals = sumTotals(entries);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Ponle un nombre a tu comida.");
      return;
    }
    try {
      const key = await touchFood({
        name: name.trim(),
        serving: totals,
        servingLabel: "comida completa",
        source: "manual",
      });
      await setFavorite(key, true);
      onClose();
    } catch {
      setError("No se pudo guardar.");
    }
  }

  return (
    <Sheet title="Guardar comida" onClose={onClose} action={<SheetAction form={FORM_ID}>Guardar</SheetAction>}>
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        <FieldGroup>
          <TextRow
            aria-label="Nombre de la comida"
            placeholder="Ej. Desayuno habitual"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
          />
        </FieldGroup>
        <div className="rounded-2xl border border-border bg-surface p-4 text-[14px]">
          <p className="font-semibold">{entries.length} alimentos</p>
          <p className="mt-1 text-muted">{entries.map((x) => x.name).join(", ")}</p>
          <p className="tabular mt-2">
            {formatNumber(totals.calories)} kcal · P {formatNumber(totals.protein)} g · C {formatNumber(totals.carbs)} g · G{" "}
            {formatNumber(totals.fat)} g
          </p>
        </div>
        <p className="px-1 text-[13px] text-muted">
          Quedará en tus favoritos (★) para registrarla completa en un toque desde «Agregar alimento».
        </p>
        {error && <p className="px-1 text-[14px] text-danger" role="alert">{error}</p>}
      </form>
    </Sheet>
  );
}
