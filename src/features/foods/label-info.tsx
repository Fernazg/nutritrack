import { referenceSeals, SEAL_LABELS, type LabelExtras } from "@/lib/nutrition/chile-seals";
import { formatNumber } from "@/lib/utils";

/** Per-100 label details + reference Chilean "ALTO EN" seals. */
export function LabelInfo({
  kcalPer100,
  extras,
  isLiquid,
}: {
  kcalPer100: number;
  extras: LabelExtras;
  isLiquid: boolean;
}) {
  const seals = referenceSeals(kcalPer100, extras, isLiquid);
  const unit = isLiquid ? "100 ml" : "100 g";
  const rows: [string, string | null][] = [
    ["Azúcares", extras.sugars !== undefined ? `${formatNumber(extras.sugars, extras.sugars % 1 ? 1 : 0)} g` : null],
    ["Grasas saturadas", extras.saturatedFat !== undefined ? `${formatNumber(extras.saturatedFat, extras.saturatedFat % 1 ? 1 : 0)} g` : null],
    ["Sodio", extras.sodiumMg !== undefined ? `${formatNumber(extras.sodiumMg)} mg` : null],
  ];

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-[13px] font-semibold text-muted">Etiqueta · por {unit}</p>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dd className="tabular text-[15px] font-semibold">{v ?? "—"}</dd>
            <dt className="text-[11px] text-muted">{k}</dt>
          </div>
        ))}
      </dl>
      {seals.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {seals.map((s) => (
            <span
              key={s}
              className="rounded-md bg-neutral-950 px-2 py-1 text-[11px] leading-tight font-bold tracking-wide text-white uppercase dark:bg-neutral-100 dark:text-neutral-950"
            >
              Alto en {SEAL_LABELS[s]}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-[12px] text-muted">Bajo los límites de sellos «ALTO EN».</p>
      )}
      <p className="mt-2 text-[11px] text-muted">
        Referencial según los límites de la Ley 20.606 (Chile) para {isLiquid ? "líquidos" : "sólidos"}; los sellos
        oficiales del envase prevalecen.
      </p>
    </div>
  );
}
