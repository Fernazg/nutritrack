"use client";

import { useState, useSyncExternalStore } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { fetchAiIdeas, getAiToken, useAiConfigured, type AiIdea } from "./ai-client";

const noop = () => () => {};

/**
 * Meal ideas from the optional AI backend. Renders nothing unless the server
 * has AI configured AND this device has the access token saved.
 */
export function AiIdeasCard({
  remaining,
  meal,
}: {
  remaining: { calories: number; protein: number; carbs: number; fat: number };
  meal: string;
}) {
  const configured = useAiConfigured();
  const hasToken = useSyncExternalStore(noop, () => getAiToken() !== "", () => false);
  const [ideas, setIdeas] = useState<AiIdea[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!configured || !hasToken || remaining.calories < 100) return null;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setIdeas(await fetchAiIdeas({ remaining, meal }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de IA.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-accent" />
        <p className="flex-1 text-[15px] font-semibold">Ideas con IA</p>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-[13px] font-semibold text-accent disabled:opacity-60"
        >
          {loading && <Loader2 className="size-3.5 animate-spin" />}
          {ideas ? "Otras ideas" : "Generar"}
        </button>
      </div>
      {error && <p className="mt-3 text-[13px] text-danger" role="alert">{error}</p>}
      {ideas && ideas.length > 0 && (
        <ul className="mt-3 space-y-2">
          {ideas.map((idea, i) => (
            <li key={i} className="rounded-2xl bg-surface-2 px-4 py-3">
              <p className="text-[14px] font-medium">{idea.nombre}</p>
              {idea.ingredientes && (
                <p className="mt-0.5 text-[12px] text-muted">{idea.ingredientes.join(", ")}</p>
              )}
              {typeof idea.kcal === "number" && (
                <p className="tabular mt-1 text-[12px] text-muted">
                  ≈ {formatNumber(idea.kcal)} kcal · P {formatNumber(idea.proteina_g ?? 0)} · C{" "}
                  {formatNumber(idea.carbohidratos_g ?? 0)} · G {formatNumber(idea.grasa_g ?? 0)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-muted">
        Generado por IA (Gemini). Las cifras son estimaciones; no es consejo médico.
      </p>
    </Card>
  );
}
