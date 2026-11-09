"use client";

import { useState } from "react";
import { ChevronRight, Database, Download, Flame, Info, Target, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Sheet } from "@/components/ui/sheet";
import { DangerButton } from "@/components/ui/field";
import { MACRO_META } from "@/components/ui/macro-bar";
import { useGoals } from "@/lib/db/hooks";
import { clearAll } from "@/lib/db/repository";
import { cn, formatNumber } from "@/lib/utils";
import { GoalsSheet } from "./goals-sheet";
import { exportDataFile } from "./data-actions";

type OpenSheet = "goals" | "clear" | null;

export function Settings() {
  const goals = useGoals();
  const [open, setOpen] = useState<OpenSheet>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleExport() {
    setBusy(true);
    setNotice(null);
    try {
      const result = await exportDataFile();
      if (result === "downloaded") setNotice("Archivo descargado.");
    } catch {
      setNotice("No se pudo exportar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    setBusy(true);
    try {
      await clearAll();
      setOpen(null);
      setNotice("Se borraron todos los datos.");
    } catch {
      setNotice("No se pudieron borrar los datos.");
    } finally {
      setBusy(false);
    }
  }

  const editGoals = () => setOpen("goals");

  return (
    <div className="space-y-7">
      <PageHeader title="Ajustes" />

      <Group title="Metas diarias">
        <Row icon={Flame} label="Calorías" value={`${formatNumber(goals.calories)} kcal`} onClick={editGoals} />
        <Row dot={MACRO_META.protein.color} label="Proteínas" value={`${formatNumber(goals.protein)} g`} onClick={editGoals} />
        <Row dot={MACRO_META.carbs.color} label="Carbohidratos" value={`${formatNumber(goals.carbs)} g`} onClick={editGoals} />
        <Row dot={MACRO_META.fat.color} label="Grasas" value={`${formatNumber(goals.fat)} g`} onClick={editGoals} />
        <Row
          icon={Target}
          label="Peso objetivo"
          value={goals.targetWeightKg ? `${formatNumber(goals.targetWeightKg, 1)} kg` : "Sin definir"}
          onClick={editGoals}
        />
      </Group>

      <Group
        title="Datos"
        footer={
          notice ?? "Tus datos se guardan solo en este dispositivo. No hay cuentas ni sincronización."
        }
      >
        <Row icon={Database} label="Almacenamiento" value="Local (IndexedDB)" />
        <Row icon={Download} label="Exportar datos" onClick={handleExport} disabled={busy} />
        <Row icon={Trash2} label="Borrar todos los datos" danger onClick={() => setOpen("clear")} />
      </Group>

      <Group title="Acerca de">
        <Row icon={Info} label="Versión" value="0.2.0" />
      </Group>

      {open === "goals" && <GoalsSheet goals={goals} onClose={() => setOpen(null)} />}

      {open === "clear" && (
        <Sheet title="Borrar datos" onClose={() => setOpen(null)}>
          <div className="space-y-4">
            <p className="px-2 text-center text-[15px] text-muted">
              Se eliminarán todos tus alimentos, registros de peso y metas de este dispositivo.
              Esta acción no se puede deshacer. Te recomendamos exportar tus datos antes.
            </p>
            <DangerButton onClick={handleClear} disabled={busy} className="font-semibold">
              Borrar todo
            </DangerButton>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function Group({
  title,
  footer,
  children,
}: {
  title: string;
  footer?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 px-5 text-[13px] font-medium tracking-wide text-muted uppercase">
        {title}
      </h2>
      <ul className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-surface">
        {children}
      </ul>
      {footer && <p className="mt-2 px-5 text-[13px] text-muted">{footer}</p>}
    </section>
  );
}

function Row({
  icon: Icon,
  dot,
  label,
  value,
  danger,
  disabled,
  onClick,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  dot?: string;
  label: string;
  value?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="flex size-5 items-center justify-center">
        {Icon ? (
          <Icon className={cn("size-5", danger ? "text-danger" : "text-muted")} />
        ) : (
          <span className="size-2.5 rounded-full" style={{ background: dot }} />
        )}
      </span>
      <span className={cn("flex-1 text-left text-[15px]", danger && "text-danger")}>{label}</span>
      {value && <span className="tabular text-[15px] text-muted">{value}</span>}
      {onClick && <ChevronRight className="size-4 text-muted" />}
    </>
  );
  const base = "flex min-h-13 w-full items-center gap-3 px-5 py-3";

  return (
    <li>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={cn(base, "active:bg-surface-2 disabled:opacity-50")}
        >
          {content}
        </button>
      ) : (
        <div className={base}>{content}</div>
      )}
    </li>
  );
}
