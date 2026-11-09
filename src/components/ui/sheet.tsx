"use client";

import { useEffect, useId } from "react";

interface SheetProps {
  title: string;
  onClose: () => void;
  /** Right-side header action (e.g. "Guardar"). Kept at the top so the iOS keyboard never hides it. */
  action?: React.ReactNode;
  children: React.ReactNode;
}

/** iOS-style bottom sheet. Mount it only while open. */
export function Sheet({ title, onClose, action, children }: SheetProps) {
  const titleId = useId();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        aria-hidden
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="animate-sheet-up pb-safe relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-bg shadow-2xl"
      >
        <div className="flex justify-center pt-2">
          <span className="h-1.5 w-10 rounded-full bg-border" />
        </div>
        <header className="grid grid-cols-[1fr_auto_1fr] items-center px-4 pt-1 pb-3">
          <button
            type="button"
            onClick={onClose}
            className="justify-self-start py-2 text-[16px] text-accent active:opacity-60"
          >
            Cancelar
          </button>
          <h2 id={titleId} className="text-[16px] font-semibold">
            {title}
          </h2>
          <div className="justify-self-end">{action}</div>
        </header>
        <div className="overflow-y-auto overscroll-contain px-4 pb-6">{children}</div>
      </div>
    </div>
  );
}

export function SheetAction({
  children,
  disabled,
  form,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  form?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type={form ? "submit" : "button"}
      form={form}
      disabled={disabled}
      onClick={onClick}
      className="py-2 text-[16px] font-semibold text-accent active:opacity-60 disabled:opacity-35"
    >
      {children}
    </button>
  );
}
