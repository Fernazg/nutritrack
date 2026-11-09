"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Barcode, ChevronLeft, Globe, Leaf, Loader2, PenLine, Search, Star, X } from "lucide-react";
import { Sheet, SheetAction } from "@/components/ui/sheet";
import { useSavedFoods } from "@/lib/db/hooks";
import { candidateFromItem, type FoodCandidate } from "@/lib/nutrition/portion";
import { genericCandidate, searchGeneric } from "@/lib/nutrition/generic-foods";
import { cn, formatNumber } from "@/lib/utils";
import type { MealType } from "@/types/nutrition";
import { PortionForm } from "./portion-form";
import { searchFoodsOnline } from "./api";

interface AddFoodSheetProps {
  date: string;
  meal: MealType;
  onClose: () => void;
  /** Opens the manual form, prefilled with the current search text. */
  onCreateManual: (name: string) => void;
}

type Tab = "recent" | "favorites";
const FORM_ID = "portion-form";

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function AddFoodSheet({ date, meal, onClose, onCreateManual }: AddFoodSheetProps) {
  const saved = useSavedFoods();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("recent");
  const [selected, setSelected] = useState<FoodCandidate | null>(null);
  const [online, setOnline] = useState<{ q: string; results: FoodCandidate[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = normalize(query.trim());
  const local = useMemo(() => {
    const list = (saved ?? []).filter((f) => (tab === "favorites" && !q ? f.favorite === 1 : true));
    if (!q) return list.slice(0, 30);
    return list.filter((f) => normalize(`${f.name} ${f.brand ?? ""}`).includes(q)).slice(0, 30);
  }, [saved, q, tab]);
  const generic = useMemo(() => (q.length >= 2 ? searchGeneric(q) : []), [q]);

  async function runOnlineSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const term = query.trim();
    if (term.length < 2 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const results = await searchFoodsOnline(term);
      setOnline({ q: term, results });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo buscar.");
    } finally {
      setLoading(false);
    }
  }

  if (selected) {
    return (
      <Sheet
        title="Agregar alimento"
        onClose={onClose}
        action={<SheetAction form={FORM_ID}>Agregar</SheetAction>}
      >
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="-mt-1 mb-3 flex items-center gap-0.5 text-[15px] font-medium text-accent"
        >
          <ChevronLeft className="size-4" strokeWidth={2.5} /> Buscar otro
        </button>
        <PortionForm food={selected} date={date} meal={meal} formId={FORM_ID} onSaved={onClose} />
      </Sheet>
    );
  }

  const showOnline = online && online.q === query.trim();

  return (
    <Sheet title="Agregar alimento" onClose={onClose}>
      <form onSubmit={runOnlineSearch} role="search" className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          inputMode="search"
          enterKeyHint="search"
          aria-label="Buscar alimento"
          placeholder="Buscar alimento o marca"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-2xl border border-border bg-surface py-3 pr-10 pl-10 outline-none focus:border-accent"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            aria-label="Borrar búsqueda"
            onClick={() => { setQuery(""); setOnline(null); }}
            className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted"
          >
            <X className="size-4" />
          </button>
        )}
      </form>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          href="/escanear/codigo"
          className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3 text-[14px] font-medium active:bg-surface-2"
        >
          <Barcode className="size-4.5 text-accent" /> Escanear
        </Link>
        <button
          type="button"
          onClick={() => onCreateManual(query.trim())}
          className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3 text-[14px] font-medium active:bg-surface-2"
        >
          <PenLine className="size-4.5 text-accent" /> Manual
        </button>
      </div>

      {!q && (
        <div className="mt-5 flex gap-5 border-b border-border px-1" role="tablist">
          {(["recent", "favorites"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                "-mb-px border-b-2 pb-2 text-[14px] font-semibold",
                tab === t ? "border-accent text-text" : "border-transparent text-muted",
              )}
            >
              {t === "recent" ? "Recientes" : "Favoritos"}
            </button>
          ))}
        </div>
      )}

      <section className="mt-3">
        {q && <h3 className="mb-2 px-1 text-[13px] font-semibold text-muted">Mis alimentos</h3>}
        {saved === undefined ? (
          <ListSkeleton />
        ) : local.length > 0 ? (
          <FoodList
            items={local.map((f) => ({ c: candidateFromItem(f), uses: f.useCount }))}
            onPick={setSelected}
          />
        ) : (
          <p className="px-1 py-3 text-[14px] text-muted">
            {q
              ? "No hay coincidencias en tus alimentos."
              : tab === "favorites"
                ? "Marca alimentos con ★ para tenerlos a mano."
                : "Lo que registres aparecerá aquí para repetirlo en un toque."}
          </p>
        )}
      </section>

      {generic.length > 0 && (
        <section className="mt-5">
          <h3 className="mb-2 flex items-center gap-1.5 px-1 text-[13px] font-semibold text-muted">
            <Leaf className="size-3.5" /> Alimentos genéricos
          </h3>
          <FoodList items={generic.map((g) => ({ c: genericCandidate(g) }))} onPick={setSelected} />
        </section>
      )}

      {query.trim().length >= 2 && (
        <section className="mt-5">
          <h3 className="mb-2 flex items-center gap-1.5 px-1 text-[13px] font-semibold text-muted">
            <Globe className="size-3.5" /> Open Food Facts
          </h3>
          {loading ? (
            <ListSkeleton />
          ) : showOnline ? (
            online.results.length > 0 ? (
              <FoodList items={online.results.map((c) => ({ c }))} onPick={setSelected} />
            ) : (
              <p className="px-1 py-3 text-[14px] text-muted">
                Sin resultados para «{online.q}». Prueba con otra palabra o créalo manualmente.
              </p>
            )
          ) : (
            <button
              type="button"
              onClick={() => runOnlineSearch()}
              className="w-full rounded-2xl bg-accent-soft py-3 text-[14px] font-semibold text-accent active:opacity-70"
            >
              Buscar «{query.trim()}» en la base de productos
            </button>
          )}
          {error && <p className="mt-2 px-1 text-[13px] text-danger" role="alert">{error}</p>}
        </section>
      )}
    </Sheet>
  );
}

function FoodList({
  items,
  onPick,
}: {
  items: { c: FoodCandidate; uses?: number }[];
  onPick: (c: FoodCandidate) => void;
}) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
      {items.map(({ c }) => {
        const base = c.per100g ?? c.serving;
        return (
          <li key={c.key ?? c.barcode ?? (c.fdcId ? `usda:${c.fdcId}` : c.name)}>
            <button
              type="button"
              onClick={() => onPick(c)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-[15px] font-medium">
                  {c.favorite && <Star className="size-3.5 shrink-0 fill-carbs text-carbs" />}
                  <span className="truncate">{c.name}</span>
                </p>
                <p className="truncate text-[12px] text-muted">
                  {[c.brand, c.per100g ? (c.isLiquid ? "por 100 ml" : "por 100 g") : c.servingLabel || "1 porción", c.servingName && c.servingGrams ? `${c.servingName} = ${formatNumber(c.servingGrams)} g` : null].filter(Boolean).join(" · ")}
                </p>
              </div>
              {base && (
                <span className="tabular shrink-0 text-[14px] font-semibold">
                  {formatNumber(base.calories)} <span className="text-[12px] font-medium text-muted">kcal</span>
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Cargando">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-2xl bg-surface-2" />
      ))}
      <Loader2 className="sr-only" />
    </div>
  );
}
