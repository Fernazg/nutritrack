import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Optional AI provider (prepared, disabled until configured).
 *
 * Uses the Google Gemini API, which has a free tier in Google AI Studio
 * (https://ai.google.dev/gemini-api/docs/pricing). Free-tier requests may be
 * used by Google to improve its products, so never send personal identifiers.
 *
 * Required env vars (Vercel → Settings → Environment Variables):
 *   AI_API_KEY        Gemini API key (free tier, no billing account)
 *   APP_ACCESS_TOKEN  long random secret; the app sends it so nobody else
 *                     can spend your quota through the public URL
 * Optional:
 *   AI_MODEL          defaults to "gemini-flash-latest"
 *   AI_FALLBACK_MODEL used when the main model answers 503 (default
 *                     "gemini-flash-lite-latest")
 */

export function aiConfigured(): boolean {
  return !!process.env.AI_API_KEY && !!process.env.APP_ACCESS_TOKEN;
}

/** Constant-time check of the x-app-token header. */
export function authorized(request: Request): boolean {
  const expected = process.env.APP_ACCESS_TOKEN;
  const given = request.headers.get("x-app-token");
  if (!expected || !given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export class AiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export type AiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

/** Calls Gemini and returns the text of the first candidate. */
export async function generateText(prompt: string, { json = false } = {}): Promise<string> {
  return generateContent([{ text: prompt }], { json });
}

/** Calls Gemini with text and/or inline images (base64). */
export async function generateContent(
  parts: AiPart[],
  { json = false, temperature = 0.6, timeoutMs = 25000, onTrace }: { json?: boolean; temperature?: number; timeoutMs?: number; onTrace?: (t: string[]) => void } = {},
): Promise<string> {
  const key = process.env.AI_API_KEY;
  if (!key) throw new AiError("IA no configurada", 503);
  const model = process.env.AI_MODEL || "gemini-flash-latest";
  // Free-tier fallback when the main model is overloaded (503).
  const fallback = process.env.AI_FALLBACK_MODEL || "gemini-flash-lite-latest";
  const started = Date.now();
  const deadline = started + timeoutMs;
  const trace: string[] = [];
  const call = (thinking: boolean, m: string, until: number) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature,
          // Thinking models count reasoning tokens here too; leave room for the answer.
          maxOutputTokens: 8192,
          ...(json ? { responseMimeType: "application/json" } : {}),
          // Default reasoning makes answers take 45 s+; these tasks don't need it.
          ...(thinking ? { thinkingConfig: { thinkingLevel: "minimal" } } : {}),
        },
      }),
      signal: AbortSignal.timeout(Math.max(1000, until - Date.now())),
    });
  /** One model; null when it timed out. */
  const attempt = async (m: string, until: number): Promise<Response | null> => {
    const t0 = Date.now();
    try {
      let r = await call(true, m, until);
      if (r.status === 400) {
        // Models that don't accept this thinking level: retry once without it.
        const body = await r.clone().text().catch(() => "");
        if (/thinking/i.test(body)) r = await call(false, m, until);
      }
      trace.push(`${m}: ${r.status} en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
      return r;
    } catch {
      trace.push(`${m}: sin respuesta en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
      return null;
    }
  };
  const canFallback = !!fallback && fallback !== model;
  // The main model gets ~55% of the time so the lighter one still has a chance.
  let res = await attempt(model, canFallback ? started + timeoutMs * 0.55 : deadline);
  if (canFallback && (!res || res.status === 503 || res.status === 500)) {
    res = (await attempt(fallback, deadline)) ?? res;
  }
  console.info("gemini", trace.join(" | "));
  onTrace?.(trace);
  if (!res) {
    throw new AiError(`La IA tardó demasiado en responder. Inténtalo de nuevo. [${trace.join("; ")}]`, 504);
  }
  if (res.status === 429) throw new AiError("Se alcanzó el límite gratuito de la IA. Inténtalo más tarde.", 429);
  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    console.error("gemini", res.status, raw.slice(0, 300));
    let reason = "";
    try {
      reason = String((JSON.parse(raw) as { error?: { message?: string } }).error?.message ?? "");
    } catch {
      /* not JSON */
    }
    // Google's error messages never include the key; strip anything key-like just in case.
    reason = reason.replace(/AIza[0-9A-Za-z_-]{20,}/g, "…").slice(0, 160);
    const hint =
      /api key not valid|API_KEY_INVALID/i.test(reason) ? "La clave AI_API_KEY no es válida (revisa que esté completa en Vercel)."
      : res.status === 404 ? "El modelo de IA configurado no está disponible."
      : res.status === 403 ? "La clave no tiene permiso para usar Gemini."
      : res.status === 503 ? "La IA de Google está saturada en este momento. Inténtalo en unos minutos."
      : "El servicio de IA no respondió correctamente.";
    throw new AiError(`${hint} [Gemini ${res.status}${reason ? `: ${reason}` : ""}]`, 502);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  };
  const text =
    data.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new AiError("La IA no devolvió contenido.", 502);
  return text;
}
