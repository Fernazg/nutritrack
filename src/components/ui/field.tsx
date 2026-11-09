import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Grouped list of inputs, iOS Settings style. */
export function FieldGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** "Proteínas" → "proteinas" (accents stripped, safe for ids). */
function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

interface FieldProps extends Omit<ComponentProps<"input">, "size"> {
  label: string;
  unit?: string;
  dot?: string;
}

/** A labelled row with the input right-aligned. */
export function Field({ label, unit, dot, className, id, ...props }: FieldProps) {
  const inputId = id ?? `f-${slug(label)}`;
  return (
    <label htmlFor={inputId} className="flex min-h-12 items-center gap-3 px-4">
      {dot && <span className="size-2.5 shrink-0 rounded-full" style={{ background: dot }} />}
      <span className="shrink-0 text-[16px]">{label}</span>
      <input
        id={inputId}
        className={cn(
          "tabular min-w-0 flex-1 bg-transparent py-3 text-right text-text outline-none placeholder:text-muted/70",
          className,
        )}
        {...props}
      />
      {unit && <span className="shrink-0 text-[15px] text-muted">{unit}</span>}
    </label>
  );
}

/** Full-width text input row (no label column). */
export function TextRow(props: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={cn(
        "w-full bg-transparent px-4 py-3.5 text-text outline-none placeholder:text-muted/70",
        props.className,
      )}
    />
  );
}

export function DangerButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "w-full rounded-2xl border border-border bg-surface py-3.5 text-[16px] font-medium text-danger active:bg-surface-2 disabled:opacity-50",
        className,
      )}
    />
  );
}
