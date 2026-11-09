"use client";

import { useState } from "react";
import { ChevronRight, LineChart, Plus, Target, TrendingDown, TrendingUp } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { useGoals, useWeightEntries } from "@/lib/db/hooks";
import { formatLongDate, useToday } from "@/lib/date";
import { formatNumber } from "@/lib/utils";
import type { WeightEntry } from "@/types/nutrition";
import { WeightChart } from "./weight-chart";
import { WeightSheet } from "./weight-sheet";
import { WeeklyStats } from "./weekly-stats";
import { MonthlyCalories } from "./monthly-calories";
import { weightChange } from "@/lib/nutrition/stats";

type Editing = { kind: "new" } | { kind: "edit"; entry: WeightEntry } | null;

export function Progress() {
  const today = useToday();
  const weights = useWeightEntries();
  const goals = useGoals();
  const [editing, setEditing] = useState<Editing>(null);

  const first = weights?.[0];
  const last = weights?.at(-1);
  const change = first && last && weights.length > 1 ? last.weightKg - first.weightKg : null;
  const change7 = weights ? weightChange(weights, 7) : null;
  const change30 = weights ? weightChange(weights, 30) : null;
  const fmtChange = (c: number) => `${c > 0 ? "+" : ""}${formatNumber(c, 1)} kg`;
  const toGoal =
    last && goals.targetWeightKg ? last.weightKg - goals.targetWeightKg : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Progreso"
        action={
          <button
            type="button"
            disabled={!today}
            onClick={() => setEditing({ kind: "new" })}
            className="flex items-center gap-1 rounded-full bg-accent px-3.5 py-2 text-[14px] font-semibold text-on-accent active:opacity-80 disabled:opacity-50"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            Peso
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <Metric label="Actual" value={last ? formatNumber(last.weightKg, 1) : "—"} unit="kg" />
        <Metric
          label="Cambio"
          value={change !== null ? `${change > 0 ? "+" : ""}${formatNumber(change, 1)}` : "—"}
          unit="kg"
          icon={change !== null && change > 0 ? TrendingUp : TrendingDown}
        />
        <Metric
          label="Meta"
          value={goals.targetWeightKg ? formatNumber(goals.targetWeightKg, 1) : "—"}
          unit="kg"
          icon={Target}
        />
      </div>
      {(change7 !== null || change30 !== null) && (
        <div className="-mt-3 flex gap-2 px-1 text-[13px]">
          {change7 !== null && (
            <span className="rounded-full bg-surface-2 px-3 py-1">7 días: <span className="tabular font-semibold">{fmtChange(change7)}</span></span>
          )}
          {change30 !== null && (
            <span className="rounded-full bg-surface-2 px-3 py-1">30 días: <span className="tabular font-semibold">{fmtChange(change30)}</span></span>
          )}
        </div>
      )}
      {toGoal !== null && (
        <p className="-mt-3 px-1 text-[13px] text-muted">
          {Math.abs(toGoal) < 0.05
            ? "¡Alcanzaste tu peso objetivo!"
            : `Te faltan ${formatNumber(Math.abs(toGoal), 1)} kg para tu meta.`}
        </p>
      )}

      {today && <WeeklyStats today={today} goals={goals} />}

      {today && <MonthlyCalories today={today} goals={goals} />}

      <section>
        <SectionTitle>Evolución del peso</SectionTitle>
        <Card>
          {weights && weights.length >= 2 ? (
            <WeightChart entries={weights} targetKg={goals.targetWeightKg} />
          ) : (
            <EmptyState
              icon={LineChart}
              title="Sin datos suficientes"
              description="Registra tu peso al menos dos veces para ver tu evolución."
            />
          )}
        </Card>
      </section>

      <section>
        <SectionTitle>Historial</SectionTitle>
        <Card className="p-0">
          {weights && weights.length > 0 ? (
            <ul className="divide-y divide-border">
              {[...weights].reverse().map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => setEditing({ kind: "edit", entry: w })}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-left text-[15px] active:bg-surface-2"
                  >
                    <span className="flex-1 text-muted">{formatLongDate(w.date)}</span>
                    <span className="tabular font-semibold">{formatNumber(w.weightKg, 1)} kg</span>
                    <ChevronRight className="size-4 text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-center text-[14px] text-muted">
              Aún no hay registros de peso.
            </p>
          )}
        </Card>
      </section>

      {editing && today && (
        <WeightSheet
          today={today}
          lastWeightKg={last?.weightKg}
          entry={editing.kind === "edit" ? editing.entry : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  icon: Icon,
}: {
  label: string;
  value: string;
  unit: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1 text-[12px] font-medium text-muted">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </div>
      <p className="tabular mt-1.5 text-[20px] font-semibold tracking-tight">
        {value}
        <span className="ml-0.5 text-[12px] font-medium text-muted">{unit}</span>
      </p>
    </Card>
  );
}
