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
 *   AI_MODEL          defaults to "gemini-2.5-flash"
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
  { json = false, temperature = 0.6, timeoutMs = 25000 } = {},
): Promise<string> {
  const key = process.env.AI_API_KEY;
  if (!key) throw new AiError("IA no configurada", 503);
  const model = process.env.AI_MODEL || "gemini-2.5-flash";
  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature,
            // Thinking models count reasoning tokens here too; leave room for the answer.
            maxOutputTokens: 8192,
            ...(json ? { responseMimeType: "application/json" } : {}),
          },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      },
    );
  } catch {
    throw new AiError("La IA tardó demasiado en responder. Inténtalo de nuevo.", 504);
  }
  if (res.status === 429) throw new AiError("Se alcanzó el límite gratuito de la IA. Inténtalo más tarde.", 429);
  if (!res.ok) {
    console.error("gemini", res.status, (await res.text().catch(() => "")).slice(0, 300));
    throw new AiError("El servicio de IA no respondió correctamente.", 502);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
  };
  const text =
    data.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new AiError("La IA no devolvió contenido.", 502);
  return text;
}
