"use client";

import { useRef, useState } from "react";
import { ChevronRight, Database, Download, Droplet, Flame, Info, Target, Trash2, Upload, UserRound } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Sheet } from "@/components/ui/sheet";
import { DangerButton } from "@/components/ui/field";
import { MACRO_META } from "@/components/ui/macro-bar";
import { useGoals, useProfile, useWeightEntries } from "@/lib/db/hooks";
import { useToday } from "@/lib/date";
import { ACTIVITY_LEVELS, GOAL_LABELS } from "@/lib/nutrition/energy";
import { clearAll, importAll } from "@/lib/db/repository";
import { cn, formatLiters, formatNumber } from "@/lib/utils";
import { GoalsSheet } from "./goals-sheet";
import { ProfileSheet } from "./profile-sheet";
import { AiSettings } from "@/features/ai/ai-settings";
import { exportDataFile } from "./data-actions";

type OpenSheet = "profile" | "goals" | "clear" | "import" | null;

export function Settings() {
  const goals = useGoals();
  const profile = useProfile();
  const weights = useWeightEntries();
  const today = useToday();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<unknown>(null);
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

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setPendingImport(JSON.parse(await file.text()));
      setOpen("import");
    } catch {
      setNotice("El archivo no es un JSON válido.");
    }
  }

  async function handleImport() {
    setBusy(true);
    try {
      const { entries } = await importAll(pendingImport);
      setOpen(null);
      setNotice(`Respaldo restaurado: ${entries} alimentos registrados.`);
    } catch (err) {
      setOpen(null);
      setNotice(err instanceof Error ? err.message : "No se pudo importar.");
    } finally {
      setBusy(false);
      setPendingImport(null);
    }
  }

  const editGoals = () => setOpen("goals");

  return (
    <div className="space-y-7">
      <PageHeader title="Ajustes" />

      <Group
        title="Perfil"
        footer="Calcula tus metas con tu edad, altura, peso y actividad. Recalcula cuando cambien tus datos."
      >
        <Row
          icon={UserRound}
          label={profile ? "Mi perfil y plan" : "Calcular mis metas"}
          value={profile ? `${GOAL_LABELS[profile.goal]} · ${ACTIVITY_LEVELS[profile.activity].label}` : undefined}
          onClick={() => setOpen("profile")}
        />
      </Group>

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
        <Row
          icon={Droplet}
          label="Agua"
          value={`${formatLiters(goals.waterMl ?? 2500)} L`}
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
        <Row icon={Upload} label="Restaurar respaldo" onClick={() => fileRef.current?.click()} disabled={busy} />
        <Row icon={Trash2} label="Borrar todos los datos" danger onClick={() => setOpen("clear")} />
      </Group>

      <AiSettings />

      <Group title="Acerca de">
        <Row icon={Info} label="Versión" value="0.4.1" />
      </Group>

      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={handleFile} />

      {open === "profile" && today && (
        <ProfileSheet
          profile={profile ?? null}
          goals={goals}
          lastWeightKg={weights?.at(-1)?.weightKg}
          today={today}
          onClose={() => setOpen(null)}
        />
      )}
      {open === "goals" && <GoalsSheet goals={goals} onClose={() => setOpen(null)} />}
      {open === "import" && (
        <Sheet title="Restaurar respaldo" onClose={() => { setOpen(null); setPendingImport(null); }}>
          <div className="space-y-4">
            <p className="px-2 text-center text-[15px] text-muted">
              Se reemplazarán todos los datos actuales de este dispositivo por los del respaldo.
            </p>
            <button
              type="button"
              onClick={handleImport}
              disabled={busy}
              className="w-full rounded-2xl bg-accent py-3.5 text-[16px] font-semibold text-on-accent disabled:opacity-50"
            >
              Restaurar
            </button>
          </div>
        </Sheet>
      )}

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
