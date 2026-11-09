"use client";

import { useState } from "react";
import { Sheet, SheetAction } from "@/components/ui/sheet";
import { DangerButton, Field, FieldGroup, TextRow } from "@/components/ui/field";
import { MACRO_META } from "@/components/ui/macro-bar";
import { addFoodEntry, deleteFoodEntry, updateFoodEntry } from "@/lib/db/repository";
import { MEALS } from "@/lib/nutrition/meals";
import { kcalFromMacros, parseNumber, round1, toInputValue } from "@/lib/parse";
import { cn } from "@/lib/utils";
import type { FoodEntry, MealType } from "@/types/nutrition";

interface FoodEntrySheetProps {
  date: string;
  meal: MealType;
  /** When present the sheet edits this entry; otherwise it creates one. */
  entry?: FoodEntry;
  onClose: () => void;
}

const FORM_ID = "food-entry-form";

export function FoodEntrySheet({ date, meal: initialMeal, entry, onClose }: FoodEntrySheetProps) {
  const [name, setName] = useState(entry?.name ?? "");
  const [quantity, setQuantity] = useState(entry?.quantity ?? "");
  const [meal, setMeal] = useState<MealType>(entry?.meal ?? initialMeal);
  const [calories, setCalories] = useState(toInputValue(entry?.calories));
  const [protein, setProtein] = useState(toInputValue(entry?.protein));
  const [carbs, setCarbs] = useState(toInputValue(entry?.carbs));
  const [fat, setFat] = useState(toInputValue(entry?.fat));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const p = parseNumber(protein) ?? 0;
  const c = parseNumber(carbs) ?? 0;
  const f = parseNumber(fat) ?? 0;
  const estimated = kcalFromMacros(p, c, f);
  const kcal = parseNumber(calories);

  const numbersValid = [calories, protein, carbs, fat].every((v) => {
    const n = parseNumber(v);
    return v.trim() === "" || (n !== null && n >= 0);
  });
  const canSave = name.trim() !== "" && numbersValid && (kcal !== null || estimated > 0) && !saving;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    const data = {
      date,
      meal,
      name: name.trim(),
      quantity: quantity.trim() || undefined,
      calories: Math.round(kcal ?? estimated),
      protein: round1(p),
      carbs: round1(c),
      fat: round1(f),
      source: entry?.source ?? ("manual" as const),
    };
    try {
      if (entry?.id !== undefined) await updateFoodEntry(entry.id, data);
      else await addFoodEntry(data);
      onClose();
    } catch {
      setError("No se pudo guardar. Inténtalo de nuevo.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (entry?.id === undefined) return;
    setSaving(true);
    try {
      await deleteFoodEntry(entry.id);
      onClose();
    } catch {
      setError("No se pudo eliminar.");
      setSaving(false);
    }
  }

  return (
    <Sheet
      title={entry ? "Editar alimento" : "Nuevo alimento"}
      onClose={onClose}
      action={
        <SheetAction form={FORM_ID} disabled={!canSave}>
          Guardar
        </SheetAction>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-5">
        <FieldGroup>
          <TextRow
            aria-label="Nombre del alimento"
            placeholder="Nombre (ej. Pan con palta)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus={!entry}
            autoComplete="off"
            enterKeyHint="next"
          />
          <TextRow
            aria-label="Cantidad"
            placeholder="Cantidad (ej. 1 marraqueta, 150 g)"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            autoComplete="off"
          />
        </FieldGroup>

        <div className="grid grid-cols-4 gap-1 rounded-2xl bg-surface-2 p-1" role="radiogroup" aria-label="Comida">
          {MEALS.map((m) => (
            <button
              key={m.type}
              type="button"
              role="radio"
              aria-checked={meal === m.type}
              onClick={() => setMeal(m.type)}
              className={cn(
                "rounded-xl py-2 text-[13px] font-medium transition-colors",
                meal === m.type ? "bg-surface shadow-sm" : "text-muted",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div>
          <FieldGroup>
            <NumberField label="Calorías" unit="kcal" value={calories} onChange={setCalories}
              placeholder={estimated > 0 ? String(estimated) : "0"} decimal={false} />
            <NumberField label="Proteínas" unit="g" dot={MACRO_META.protein.color} value={protein} onChange={setProtein} />
            <NumberField label="Carbohidratos" unit="g" dot={MACRO_META.carbs.color} value={carbs} onChange={setCarbs} />
            <NumberField label="Grasas" unit="g" dot={MACRO_META.fat.color} value={fat} onChange={setFat} />
          </FieldGroup>
          <p className="mt-2 px-4 text-[13px] text-muted">
            {kcal === null && estimated > 0
              ? `Se guardarán ${estimated} kcal, calculadas desde los macros.`
              : "Si dejas las calorías vacías, se calculan desde los macros."}
          </p>
        </div>

        {error && <p className="px-4 text-[14px] text-danger">{error}</p>}

        {entry && (
          <DangerButton onClick={handleDelete} disabled={saving}>
            Eliminar alimento
          </DangerButton>
        )}
      </form>
    </Sheet>
  );
}

function NumberField({
  label,
  unit,
  dot,
  value,
  onChange,
  placeholder = "0",
  decimal = true,
}: {
  label: string;
  unit: string;
  dot?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  decimal?: boolean;
}) {
  return (
    <Field
      label={label}
      unit={unit}
      dot={dot}
      inputMode={decimal ? "decimal" : "numeric"}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
      autoComplete="off"
    />
  );
}
