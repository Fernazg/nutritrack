"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, ImageIcon, Leaf, Loader2, Sparkles, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { addFoodEntry, touchFood } from "@/lib/db/repository";
import { useToday } from "@/lib/date";
import { mealForHour } from "@/lib/nutrition/meals";
import { amountLabel, nutritionFor, type FoodCandidate } from "@/lib/nutrition/portion";
import { photoCandidate, type PhotoItem } from "@/lib/nutrition/photo";
import { parseNumber, toInputValue } from "@/lib/parse";
import { cn, formatNumber } from "@/lib/utils";
import type { MealType, NutritionTotals } from "@/types/nutrition";
import { analyzeMealPhoto, getAiToken, photoToJpegBase64, useAiConfigured } from "@/features/ai/ai-client";
import { MealPicker } from "@/features/meals/meal-picker";

interface Row {
  id: number;
  detected: string;
  food: FoodCandidate;
  grams: string;
  verified: boolean;
}

type Status =
  | { kind: "idle" }
  | { kind: "analyzing" }
  | { kind: "result"; note?: string }
  | { kind: "error"; message: string };

const noop = () => () => {};
const ZERO: NutritionTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

function rowsFrom(items: PhotoItem[]): Row[] {
  return items.map((it, i) => {
    const food = photoCandidate(it);
    return { id: i, detected: it.name, food, grams: toInputValue(it.grams), verified: food.source === "generic" };
  });
}

/**
 * Meal photo → list of foods with estimated grams, editable before logging.
 * Calories come from the USDA list when the food matches; otherwise from the
 * AI's estimate, clearly labelled.
 */
export function MealPhoto({ title, description }: { title: string; description: string }) {
  const router = useRouter();
  const today = useToday();
  const configured = useAiConfigured();
  const hasToken = useSyncExternalStore(noop, () => getAiToken() !== "", () => false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [rows, setRows] = useState<Row[]>([]);
  const [meal, setMeal] = useState<MealType>(() => mealForHour(new Date().getHours()));
  const [saving, setSaving] = useState(false);

  const ready = configured === true && hasToken;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setStatus({ kind: "analyzing" });
    setRows([]);
    try {
      const { base64, previewUrl } = await photoToJpegBase64(file);
      setPreview(previewUrl);
      const result = await analyzeMealPhoto(base64);
      if (!result.isFood || result.items.length === 0) {
        setStatus({ kind: "error", message: "No reconocí comida en la foto. Prueba con el plato completo, desde arriba y con buena luz." });
        return;
      }
      setRows(rowsFrom(result.items));
      setStatus({ kind: "result", note: result.note });
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error && err.message !== "canvas" ? err.message : "No se pudo procesar la foto." });
    }
  }

  const parsed = rows.map((r) => {
    const g = parseNumber(r.grams);
    const valid = g !== null && g > 0 && g <= 3000;
    return { row: r, grams: valid ? g : null, totals: valid ? nutritionFor(r.food, g) : ZERO };
  });
  const total = parsed.reduce(
    (a, p) => ({
      calories: a.calories + p.totals.calories,
      protein: a.protein + p.totals.protein,
      carbs: a.carbs + p.totals.carbs,
      fat: a.fat + p.totals.fat,
    }),
    ZERO,
  );
  const canSave = parsed.length > 0 && parsed.every((p) => p.grams !== null);

  async function save() {
    if (!today || !canSave || saving) return;
    setSaving(true);
    try {
      for (const { row, grams, totals } of parsed) {
        const g = grams!;
        // Only USDA-backed foods go to "recientes"; AI estimates are logged once.
        const foodKey = row.verified
          ? await touchFood({
              name: row.food.name,
              per100g: row.food.per100g,
              servingName: row.food.servingName,
              servingGrams: row.food.servingGrams,
              fdcId: row.food.fdcId,
              lastGrams: g,
              source: "generic",
            })
          : undefined;
        await addFoodEntry({
          date: today,
          meal,
          name: row.verified ? row.food.name : `${row.food.name} (estimado)`,
          quantity: amountLabel(row.food, g),
          grams: g,
          foodKey,
          source: "photo",
          ...totals,
        });
      }
      router.push("/diario");
    } catch {
      setStatus({ kind: "error", message: "No se pudo guardar. Inténtalo de nuevo." });
      setSaving(false);
    }
  }

  const update = (id: number, grams: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, grams: grams.replace(/[^\d.,]/g, "") } : r)));
  const remove = (id: number) => setRows((rs) => rs.filter((r) => r.id !== id));
  const analyzing = status.kind === "analyzing";

  return (
    <div className="space-y-5">
      <PageHeader title={title} subtitle={description} backHref="/escanear" />

      {configured === false || (configured && !hasToken) ? (
        <div className="rounded-3xl border border-border bg-surface p-5 text-[14px]">
          <p className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-accent" /> Falta activar la IA</p>
          <p className="mt-1.5 text-muted">
            {configured === false
              ? "El servidor aún no tiene una clave de IA configurada (AI_API_KEY y APP_ACCESS_TOKEN en Vercel)."
              : "Guarda tu token de acceso en Ajustes › Inteligencia artificial para usar el análisis de fotos."}
          </p>
          <Link href="/ajustes" className="mt-3 inline-block text-[14px] font-semibold text-accent">Ir a Ajustes</Link>
        </div>
      ) : null}

      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-neutral-900">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local data URL preview
          <img src={preview} alt="Foto de la comida" className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-neutral-800 to-neutral-950 px-8 text-center text-white/70">
            <Camera className="size-7" />
            <p className="text-[13px]">Foto del plato completo, desde arriba y con buena luz.</p>
          </div>
        )}
        {analyzing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
            <p className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-[14px] font-medium backdrop-blur">
              <Loader2 className="size-4 animate-spin" /> Analizando…
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={!ready || analyzing} onClick={() => cameraRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-[15px] font-semibold text-on-accent active:scale-[0.98] disabled:opacity-40">
          <Camera className="size-5" /> {preview ? "Otra foto" : "Tomar foto"}
        </button>
        <button type="button" disabled={!ready || analyzing} onClick={() => galleryRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3 text-[15px] font-medium active:bg-surface-2 disabled:opacity-40">
          <ImageIcon className="size-5 text-accent" /> Galería
        </button>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
          aria-label="Tomar foto de la comida" onChange={onFile} />
        <input ref={galleryRef} type="file" accept="image/*" className="hidden"
          aria-label="Elegir foto de la comida" onChange={onFile} />
      </div>

      <div aria-live="polite">
        {status.kind === "error" && (
          <div role="alert" className="rounded-2xl border border-danger/30 bg-surface p-4 text-[14px] text-danger">
            {status.message}
          </div>
        )}
      </div>

      {status.kind === "result" && (
        <section className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-border bg-surface">
            <ul className="divide-y divide-border" aria-label="Alimentos detectados">
              {parsed.map(({ row, totals }) => (
                <li key={row.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{row.food.name}</p>
                    <p className="flex items-center gap-1 text-[12px] text-muted">
                      {row.verified ? (
                        <><Leaf className="size-3 text-accent" /> USDA</>
                      ) : (
                        <><Sparkles className="size-3" /> Estimación IA</>
                      )}
                      <span>· {formatNumber(totals.calories)} kcal</span>
                    </p>
                    {row.verified && row.detected.toLowerCase() !== row.food.name.toLowerCase() && (
                      <p className="truncate text-[11px] text-muted">Detectado: {row.detected}</p>
                    )}
                  </div>
                  <label className="flex items-center gap-1 rounded-xl bg-surface-2 px-2 py-1.5">
                    <input
                      inputMode="decimal"
                      value={row.grams}
                      onChange={(e) => update(row.id, e.target.value)}
                      onFocus={(e) => e.currentTarget.select()}
                      aria-label={`Gramos de ${row.food.name}`}
                      className="tabular w-12 bg-transparent text-right text-[15px] outline-none"
                    />
                    <span className="text-[13px] text-muted">g</span>
                  </label>
                  <button type="button" onClick={() => remove(row.id)} aria-label={`Quitar ${row.food.name}`}
                    className="flex size-8 items-center justify-center rounded-full text-muted active:bg-surface-2">
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-4 gap-2 border-t border-border p-3 text-center">
              <Stat value={formatNumber(total.calories)} label="kcal" />
              <Stat value={formatNumber(Math.round(total.protein))} label="Prot. g" />
              <Stat value={formatNumber(Math.round(total.carbs))} label="Carb. g" />
              <Stat value={formatNumber(Math.round(total.fat))} label="Grasa g" />
            </div>
          </div>

          <MealPicker value={meal} onChange={setMeal} />

          <button type="button" onClick={save} disabled={!canSave || saving || !today}
            className={cn("flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 text-[16px] font-semibold text-on-accent disabled:opacity-40")}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Registrar {parsed.length} {parsed.length === 1 ? "alimento" : "alimentos"}
          </button>

          <p className="px-1 text-[12px] text-muted">
            Los gramos son una estimación a partir de la foto: corrígelos si conoces la porción.
            {status.note ? ` ${status.note}` : ""} Las calorías usan USDA FoodData Central cuando el alimento está en la lista; si no, la estimación de la IA (Gemini).
          </p>
        </section>
      )}

      <p className="px-1 text-[12px] text-muted">
        La foto se envía a Google Gemini para el análisis y no se guarda en la app. No incluyas personas ni datos personales en la imagen.
      </p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="tabular text-[16px] font-semibold">{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}
