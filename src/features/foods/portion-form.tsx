"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Field, FieldGroup } from "@/components/ui/field";
import { MACRO_META } from "@/components/ui/macro-bar";
import { logFood, setFavorite } from "@/lib/db/repository";
import { parseNumber, toInputValue } from "@/lib/parse";
import { amountLabel, defaultAmount, isByWeight, nutritionFor, type FoodCandidate } from "@/lib/nutrition/portion";
import { cn, formatNumber } from "@/lib/utils";
import type { MealType } from "@/types/nutrition";
import { MealPicker } from "@/features/meals/meal-picker";
import { LabelInfo } from "./label-info";

interface PortionFormProps {
  food: FoodCandidate;
  date: string;
  meal: MealType;
  formId: string;
  onSaved: () => void;
}

/** Choose how much was eaten and log it. Submitted via the sheet's "Agregar" button. */
export function PortionForm({ food, date, meal: initialMeal, formId, onSaved }: PortionFormProps) {
  const byWeight = isByWeight(food);
  const u = food.isLiquid ? "ml" : "g";
  const [amount, setAmount] = useState(toInputValue(defaultAmount(food)));
  const [meal, setMeal] = useState<MealType>(initialMeal);
  const [fav, setFav] = useState(!!food.favorite);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const n = parseNumber(amount);
  const valid = n !== null && n > 0 && n <= (byWeight ? 5000 : 50);
  const totals = nutritionFor(food, valid ? n : 0);

  const chips = byWeight
    ? [
        ...(food.servingGrams ? [{ label: `1 porción · ${formatNumber(food.servingGrams)} ${u}`, v: food.servingGrams }] : []),
        { label: `50 ${u}`, v: 50 },
        { label: `100 ${u}`, v: 100 },
        { label: `150 ${u}`, v: 150 },
        { label: `200 ${u}`, v: 200 },
      ]
    : [0.5, 1, 1.5, 2].map((v) => ({ label: `${toInputValue(v)}×`, v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!valid || n === null) {
      setError(byWeight ? `Ingresa una cantidad válida en ${food.isLiquid ? "mililitros" : "gramos"}.` : "Ingresa un número de porciones válido.");
      return;
    }
    setSaving(true);
    try {
      await logFood(
        {
          date,
          meal,
          name: food.brand ? `${food.name} · ${food.brand}` : food.name,
          quantity: amountLabel(food, n),
          grams: byWeight ? n : undefined,
          source: food.source,
          ...totals,
        },
        {
          name: food.name,
          brand: food.brand,
          barcode: food.barcode,
          per100g: food.per100g,
          serving: food.serving,
          servingLabel: food.servingLabel,
          isLiquid: food.isLiquid,
          lastGrams: byWeight ? n : undefined,
        },
      );
      if (fav !== !!food.favorite && food.key) await setFavorite(food.key, fav);
      onSaved();
    } catch {
      setError("No se pudo guardar. Inténtalo de nuevo.");
      setSaving(false);
    }
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-start gap-3 px-1">
        <div className="min-w-0 flex-1">
          <p className="text-[18px] leading-snug font-semibold">{food.name}</p>
          {food.brand && <p className="text-[14px] text-muted">{food.brand}</p>}
          <p className="mt-1 text-[12px] text-muted">
            {food.per100g
              ? `${formatNumber(food.per100g.calories)} kcal por 100 ${u}`
              : food.serving
                ? `${formatNumber(food.serving.calories)} kcal por porción`
                : ""}
          </p>
        </div>
        {food.key && (
          <button
            type="button"
            onClick={() => setFav((f) => !f)}
            aria-pressed={fav}
            aria-label={fav ? "Quitar de favoritos" : "Agregar a favoritos"}
            className="flex size-10 items-center justify-center rounded-full bg-surface-2 active:scale-95"
          >
            <Star className={cn("size-5", fav ? "fill-carbs text-carbs" : "text-muted")} />
          </button>
        )}
      </div>

      <div>
        <FieldGroup>
          <Field
            label={byWeight ? "Cantidad" : "Porciones"}
            unit={byWeight ? u : "×"}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
            onFocus={(e) => e.currentTarget.select()}
            autoComplete="off"
          />
        </FieldGroup>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => setAmount(toInputValue(c.v))}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-medium",
                n === c.v ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 rounded-2xl border border-border bg-surface p-3 text-center">
        <Stat value={formatNumber(totals.calories)} label="kcal" />
        <Stat value={formatNumber(totals.protein, totals.protein % 1 ? 1 : 0)} label="Prot." color={MACRO_META.protein.color} />
        <Stat value={formatNumber(totals.carbs, totals.carbs % 1 ? 1 : 0)} label="Carb." color={MACRO_META.carbs.ink} />
        <Stat value={formatNumber(totals.fat, totals.fat % 1 ? 1 : 0)} label="Grasa" color={MACRO_META.fat.ink} />
      </div>

      {food.extras && food.per100g && (
        <LabelInfo kcalPer100={food.per100g.calories} extras={food.extras} isLiquid={!!food.isLiquid} />
      )}

      <MealPicker value={meal} onChange={setMeal} />

      {food.source === "search" || food.source === "barcode" ? (
        <p className="px-1 text-[12px] text-muted">
          Datos de Open Food Facts (colaborativos, licencia ODbL). Revisa la etiqueta si algo no cuadra.
        </p>
      ) : null}

      {error && <p className="px-1 text-[14px] text-danger" role="alert">{error}</p>}
    </form>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div>
      <p className="tabular text-[17px] font-semibold" style={color ? { color } : undefined}>{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}
