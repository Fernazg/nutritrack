import { NextResponse } from "next/server";
import { AiError, aiConfigured, authorized, generateContent } from "@/lib/server/ai";
import { buildPhotoPrompt, parsePhotoResponse } from "@/lib/nutrition/photo";

export const maxDuration = 60;

const MAX_BASE64 = 2_800_000; // ≈ 2 MB image; the app sends ~150–400 KB
const MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Meal photo → detected foods with estimated grams. Requires AI_API_KEY +
 * APP_ACCESS_TOKEN and the x-app-token header. The image is forwarded to
 * Gemini and not stored by this app.
 */
export async function POST(request: Request) {
  if (!aiConfigured()) return NextResponse.json({ error: "IA no configurada" }, { status: 503 });
  if (!authorized(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: { image?: unknown; mimeType?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const image = typeof body.image === "string" ? body.image : "";
  const mimeType = typeof body.mimeType === "string" && MIME.has(body.mimeType) ? body.mimeType : null;
  if (!image || !mimeType || image.length > MAX_BASE64 || !/^[A-Za-z0-9+/]+=*$/.test(image)) {
    return NextResponse.json({ error: "Imagen inválida o demasiado grande" }, { status: 400 });
  }

  try {
    const text = await generateContent(
      [{ inlineData: { mimeType, data: image } }, { text: buildPhotoPrompt() }],
      { json: true, temperature: 0.2, timeoutMs: 55000 },
    );
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new AiError("La IA devolvió una respuesta ilegible. Inténtalo de nuevo.", 502);
    }
    return NextResponse.json({ ...parsePhotoResponse(parsed), estimated: true });
  } catch (err) {
    const status = err instanceof AiError ? err.status : 502;
    const message = err instanceof AiError ? err.message : "No se pudo analizar la foto.";
    return NextResponse.json({ error: message }, { status });
  }
}
