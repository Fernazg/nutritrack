"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Keyboard, Loader2 } from "lucide-react";
import { Sheet, SheetAction } from "@/components/ui/sheet";
import { Field, FieldGroup } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { useToday } from "@/lib/date";
import { mealForHour } from "@/lib/nutrition/meals";
import type { FoodCandidate } from "@/lib/nutrition/portion";
import { lookupBarcode } from "@/features/foods/api";
import { PortionForm } from "@/features/foods/portion-form";
import { FoodEntrySheet } from "@/features/meals/food-entry-sheet";

type Status =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "scanning" }
  | { kind: "looking"; code: string }
  | { kind: "found"; food: FoodCandidate }
  | { kind: "not_found"; code: string }
  | { kind: "error"; message: string };

const FORM_ID = "barcode-portion";

/**
 * Camera barcode scanner (EAN/UPC) using ZXing, with manual code entry as a
 * fallback. Products are looked up in Open Food Facts through our API.
 */
export function BarcodeScanner() {
  const today = useToday();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [manualCode, setManualCode] = useState("");
  const [manualFor, setManualFor] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const lookup = useCallback(async (code: string) => {
    setStatus({ kind: "looking", code });
    try {
      const food = await lookupBarcode(code);
      setStatus(food ? { kind: "found", food } : { kind: "not_found", code });
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "No se pudo buscar el código." });
    }
  }, []);

  async function startCamera() {
    if (!videoRef.current) return;
    setStatus({ kind: "starting" });
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const { BarcodeFormat, DecodeHintType } = await import("@zxing/library");
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
      ]);
      const reader = new BrowserMultiFormatReader(hints);
      controlsRef.current = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        videoRef.current,
        (result) => {
          if (!result) return;
          stopCamera();
          navigator.vibrate?.(40);
          void lookup(result.getText());
        },
      );
      setStatus({ kind: "scanning" });
    } catch (err) {
      stopCamera();
      const denied = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError");
      setStatus({
        kind: "error",
        message: denied
          ? "No hay permiso para usar la cámara. Actívalo en Ajustes › Safari › Cámara, o ingresa el código a mano."
          : "No se pudo iniciar la cámara. Puedes ingresar el código a mano.",
      });
    }
  }

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const code = manualCode.replace(/\D/g, "");
    if (code.length < 6) return;
    stopCamera();
    void lookup(code);
  }

  const reset = () => setStatus({ kind: "idle" });
  const cameraOn = status.kind === "starting" || status.kind === "scanning";
  const meal = mealForHour(new Date().getHours());

  return (
    <div className="space-y-5">
      <PageHeader title="Código de barras" subtitle="Escanea un producto envasado." backHref="/escanear" />

      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-neutral-900">
        <video
          ref={videoRef}
          playsInline
          muted
          className={cameraOn ? "absolute inset-0 size-full object-cover" : "hidden"}
        />
        <div className="absolute top-1/2 left-1/2 h-28 w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-white/80">
          {status.kind === "scanning" && (
            <div className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 animate-pulse rounded-full bg-accent shadow-[0_0_12px_var(--accent)]" />
          )}
        </div>
        {!cameraOn && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center">
            <button
              type="button"
              onClick={startCamera}
              className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[15px] font-semibold text-neutral-900 active:scale-95"
            >
              <Camera className="size-5" /> Activar cámara
            </button>
          </div>
        )}
        {cameraOn && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center">
            <button
              type="button"
              onClick={() => { stopCamera(); reset(); }}
              className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-[14px] font-medium text-white backdrop-blur"
            >
              <CameraOff className="size-4" /> Detener
            </button>
          </div>
        )}
      </div>

      <div aria-live="polite">
        {status.kind === "starting" && <Notice>Iniciando cámara…</Notice>}
        {status.kind === "scanning" && <Notice>Centra el código dentro del recuadro.</Notice>}
        {status.kind === "looking" && (
          <Notice>
            <Loader2 className="size-4 animate-spin" /> Buscando {status.code}…
          </Notice>
        )}
        {status.kind === "not_found" && (
          <div className="rounded-2xl border border-border bg-surface p-4 text-[14px]">
            <p className="font-semibold">Producto no encontrado</p>
            <p className="mt-1 text-muted">
              El código {status.code} no está en Open Food Facts. Puedes registrarlo con los datos de su etiqueta.
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setManualFor(status.code)}
                className="rounded-full bg-accent px-4 py-2 text-[14px] font-semibold text-white">
                Registrar manualmente
              </button>
              <button type="button" onClick={reset} className="rounded-full px-4 py-2 text-[14px] font-medium text-accent">
                Escanear otro
              </button>
            </div>
          </div>
        )}
        {status.kind === "error" && (
          <div role="alert" className="rounded-2xl border border-danger/30 bg-surface p-4 text-[14px] text-danger">
            {status.message}
          </div>
        )}
      </div>

      <form onSubmit={submitManual}>
        <p className="mb-2 flex items-center gap-1.5 px-1 text-[13px] font-semibold text-muted">
          <Keyboard className="size-4" /> Ingresar código a mano
        </p>
        <div className="flex gap-2">
          <FieldGroup className="flex-1">
            <Field
              label="Código"
              inputMode="numeric"
              enterKeyHint="search"
              placeholder="7802920000084"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.replace(/\D/g, "").slice(0, 14))}
              autoComplete="off"
            />
          </FieldGroup>
          <button
            type="submit"
            disabled={manualCode.length < 6}
            className="rounded-2xl bg-accent px-4 text-[15px] font-semibold text-white disabled:opacity-40"
          >
            Buscar
          </button>
        </div>
      </form>

      {status.kind === "found" && today && (
        <Sheet title="Producto" onClose={reset} action={<SheetAction form={FORM_ID}>Agregar</SheetAction>}>
          <PortionForm food={status.food} date={today} meal={meal} formId={FORM_ID} onSaved={reset} />
        </Sheet>
      )}
      {manualFor && today && (
        <FoodEntrySheet date={today} meal={meal} onClose={() => { setManualFor(null); reset(); }} />
      )}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="flex items-center justify-center gap-2 text-center text-[14px] text-muted">{children}</p>;
}
