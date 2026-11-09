"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Field, FieldGroup } from "@/components/ui/field";
import { getAiToken, setAiToken, useAiConfigured } from "./ai-client";

/** Settings block: AI status and the device-local access token. */
export function AiSettings() {
  const configured = useAiConfigured();
  const [token, setToken] = useState(() => (typeof window === "undefined" ? "" : getAiToken()));
  const [saved, setSaved] = useState(false);

  return (
    <section>
      <h2 className="mb-2 px-5 text-[13px] font-medium tracking-wide text-muted uppercase">Inteligencia artificial</h2>
      <div className="overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="flex items-center gap-3 px-5 py-3.5">
          <Sparkles className="size-5 text-muted" />
          <span className="flex-1 text-[15px]">Estado del servidor</span>
          <span className="text-[15px] text-muted">
            {configured === null ? "Comprobando…" : configured ? "Configurada" : "No configurada"}
          </span>
        </div>
      </div>
      {configured && (
        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            setAiToken(token.trim());
            setSaved(true);
          }}
        >
          <FieldGroup>
            <Field
              label="Token de acceso"
              type="password"
              autoComplete="off"
              placeholder="Pega tu APP_ACCESS_TOKEN"
              value={token}
              onChange={(e) => { setToken(e.target.value); setSaved(false); }}
            />
          </FieldGroup>
          <button type="submit" className="mt-2 ml-5 text-[14px] font-semibold text-accent">
            {saved ? "Guardado en este dispositivo ✓" : "Guardar token"}
          </button>
        </form>
      )}
      <p className="mt-2 px-5 text-[13px] text-muted">
        {configured
          ? "El token se guarda solo en este dispositivo y evita que otros usen tu cuota."
          : "Opcional y gratuita: configura AI_API_KEY (Google AI Studio, plan gratuito) y APP_ACCESS_TOKEN en Vercel. Instrucciones en docs/IA.md."}
      </p>
    </section>
  );
}
