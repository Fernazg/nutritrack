"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Sheet, SheetAction } from "@/components/ui/sheet";
import { Field, FieldGroup } from "@/components/ui/field";
import { saveGoals, saveProfile, saveWeight } from "@/lib/db/repository";
import {
  ACTIVITY_LEVELS,
  DEFAULT_PROFILE,
  GOAL_LABELS,
  computePlan,
  type PlanWarning,
} from "@/lib/nutrition/energy";
import { parseNumber, round1, toInputValue } from "@/lib/parse";
import { cn, formatLiters, formatNumber } from "@/lib/utils";
import type { ActivityLevel, GoalType, Goals, Profile, Sex } from "@/types/nutrition";

interface ProfileSheetProps {
  profile: Profile | null;
  goals: Goals;
  lastWeightKg?: number;
  today: string;
  onClose: () => void;
}

const FORM_ID = "profile-form";
const clean = (v: string) => v.replace(/[^\d.,]/g, "");

const WARNING_TEXT: Record<PlanWarning, string> = {
  deficit_capped: "Limitamos el déficit al 25 % de tu gasto diario para que sea sostenible.",
  floor_applied: "Ajustamos al mínimo recomendado de calorías para una dieta sin supervisión.",
  carbs_low: "Con estas metas quedan pocos carbohidratos; considera un ritmo más lento.",
};

export function ProfileSheet({ profile, goals, lastWeightKg, today, onClose }: ProfileSheetProps) {
  const thisYear = Number(today.slice(0, 4));
  const [sex, setSex] = useState<Sex>(profile?.sex ?? "male");
  const [birthYear, setBirthYear] = useState(profile ? String(profile.birthYear) : "");
  const [height, setHeight] = useState(toInputValue(profile?.heightCm));
  const [weight, setWeight] = useState(toInputValue(lastWeightKg));
  const [activity, setActivity] = useState<ActivityLevel>(profile?.activity ?? DEFAULT_PROFILE.activity);
  const [goal, setGoal] = useState<GoalType>(profile?.goal ?? DEFAULT_PROFILE.goal);
  const [rate, setRate] = useState(profile?.rateKgPerWeek ?? DEFAULT_PROFILE.rateKgPerWeek);
  const [proteinPerKg, setProteinPerKg] = useState(profile?.proteinPerKg ?? DEFAULT_PROFILE.proteinPerKg);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const by = parseNumber(birthYear);
  const h = parseNumber(height);
  const w = parseNumber(weight);
  const valid =
    by !== null && by >= thisYear - 100 && by <= thisYear - 16 &&
    h !== null && h >= 120 && h <= 230 &&
    w !== null && w >= 30 && w <= 300;

  const draft: Profile | null = valid
    ? { sex, birthYear: by, heightCm: h, activity, goal, rateKgPerWeek: rate, proteinPerKg }
    : null;
  const plan = draft && w !== null ? computePlan(draft, w, new Date(`${today}T12:00:00`)) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!draft || !plan || w === null) {
      setError("Completa año de nacimiento (16+ años), altura y peso.");
      return;
    }
    setSaving(true);
    try {
      await saveProfile(draft);
      await saveGoals({ ...goals, ...plan.goals });
      if (lastWeightKg === undefined || round1(w) !== round1(lastWeightKg)) await saveWeight(today, round1(w));
      onClose();
    } catch {
      setError("No se pudo guardar. Inténtalo de nuevo.");
      setSaving(false);
    }
  }

  const rates = goal === "gain" ? [0.25, 0.5] : [0.25, 0.5, 0.75, 1];

  return (
    <Sheet
      title="Mi perfil"
      onClose={onClose}
      action={<SheetAction form={FORM_ID}>Aplicar</SheetAction>}
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-5">
        <Segmented
          label="Sexo"
          value={sex}
          onChange={setSex}
          options={[{ v: "male", l: "Hombre" }, { v: "female", l: "Mujer" }]}
        />

        <FieldGroup>
          <Field label="Año de nacimiento" inputMode="numeric" placeholder="1995"
            value={birthYear} onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))} />
          <Field label="Altura" unit="cm" inputMode="decimal" placeholder="170"
            value={height} onChange={(e) => setHeight(clean(e.target.value))} />
          <Field label="Peso actual" unit="kg" inputMode="decimal" placeholder="75"
            value={weight} onChange={(e) => setWeight(clean(e.target.value))} />
        </FieldGroup>

        <div>
          <p className="mb-2 px-1 text-[13px] font-semibold text-muted">Nivel de actividad</p>
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface" role="radiogroup">
            {(Object.keys(ACTIVITY_LEVELS) as ActivityLevel[]).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={activity === k}
                onClick={() => setActivity(k)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2"
              >
                <span className={cn("size-5 shrink-0 rounded-full border-2", activity === k ? "border-[6px] border-accent" : "border-border")} />
                <span className="flex-1">
                  <span className="block text-[15px] font-medium">{ACTIVITY_LEVELS[k].label}</span>
                  <span className="block text-[12px] text-muted">{ACTIVITY_LEVELS[k].hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <Segmented
          label="Objetivo"
          value={goal}
          onChange={(g) => { setGoal(g); if (g === "gain" && rate > 0.5) setRate(0.25); }}
          options={(Object.keys(GOAL_LABELS) as GoalType[]).map((v) => ({ v, l: GOAL_LABELS[v] }))}
        />

        {goal !== "maintain" && (
          <Segmented
            label={goal === "lose" ? "Ritmo de pérdida por semana" : "Ritmo de ganancia por semana"}
            value={rate}
            onChange={setRate}
            options={rates.map((v) => ({ v, l: `${toInputValue(v)} kg` }))}
          />
        )}

        <Segmented
          label="Proteína (g por kg de peso)"
          value={proteinPerKg}
          onChange={setProteinPerKg}
          options={[1.2, 1.6, 2.0, 2.2].map((v) => ({ v, l: toInputValue(v) }))}
        />

        {plan ? (
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-[13px] font-semibold text-muted">Tu plan estimado</p>
            <p className="tabular mt-1 text-[32px] leading-none font-bold tracking-tight">
              {formatNumber(plan.goals.calories)}
              <span className="ml-1 text-[15px] font-medium text-muted">kcal/día</span>
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[14px]">
              <Row k="Metabolismo basal" v={`${formatNumber(plan.bmr)} kcal`} />
              <Row k="Mantenimiento" v={`${formatNumber(plan.tdee)} kcal`} />
              <Row k={plan.adjustment <= 0 ? "Déficit" : "Superávit"} v={`${formatNumber(Math.abs(plan.adjustment))} kcal`} />
              <Row k="Ritmo esperado" v={`${plan.expectedKgPerWeek > 0 ? "+" : ""}${formatNumber(plan.expectedKgPerWeek, 2)} kg/sem`} />
              <Row k="Proteínas" v={`${plan.goals.protein} g`} />
              <Row k="Carbohidratos" v={`${plan.goals.carbs} g`} />
              <Row k="Grasas" v={`${plan.goals.fat} g`} />
              <Row k="Agua" v={`${formatLiters(plan.goals.waterMl)} L`} />
            </dl>
            {plan.warnings.map((wn) => (
              <p key={wn} className="mt-3 flex gap-2 text-[13px] text-carbs-ink">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {WARNING_TEXT[wn]}
              </p>
            ))}
          </div>
        ) : (
          <p className="px-1 text-[13px] text-muted">Completa tus datos para ver el cálculo.</p>
        )}

        <p className="px-1 text-[12px] leading-relaxed text-muted">
          Estimación con la ecuación de Mifflin-St Jeor y factores de actividad estándar. No es una
          indicación médica: el gasto real varía entre personas. Ajusta según tu evolución de peso
          tras 2–3 semanas.
        </p>

        {error && <p className="px-1 text-[14px] text-danger" role="alert">{error}</p>}
      </form>
    </Sheet>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[12px] text-muted">{k}</dt>
      <dd className="tabular font-semibold">{v}</dd>
    </div>
  );
}

function Segmented<T extends string | number>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { v: T; l: string }[];
}) {
  return (
    <div>
      <p className="mb-2 px-1 text-[13px] font-semibold text-muted">{label}</p>
      <div
        className="grid gap-1 rounded-2xl bg-surface-2 p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        role="radiogroup"
        aria-label={label}
      >
        {options.map((o) => (
          <button
            key={String(o.v)}
            type="button"
            role="radio"
            aria-checked={value === o.v}
            onClick={() => onChange(o.v)}
            className={cn(
              "truncate rounded-xl px-1 py-2 text-[13px] font-medium transition-colors",
              value === o.v ? "bg-surface text-text shadow-sm" : "text-muted",
            )}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
}
