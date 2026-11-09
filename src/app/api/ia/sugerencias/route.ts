import { NextResponse } from "next/server";
import { AiError, aiConfigured, authorized, generateText } from "@/lib/server/ai";

interface Body {
  remaining?: { calories?: number; protein?: number; carbs?: number; fat?: number };
  meal?: string;
  preferences?: string;
}

const n = (v: unknown, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? Math.round(v) : null;

/**
 * Meal ideas for the remaining macros. Requires AI_API_KEY + APP_ACCESS_TOKEN
 * and the x-app-token header. Returns estimates, not verified nutrition data.
 */
export async function POST(request: Request) {
  if (!aiConfigured()) return NextResponse.json({ error: "IA no configurada" }, { status: 503 });
  if (!authorized(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const kcal = n(body.remaining?.calories, 5000);
  const protein = n(body.remaining?.protein, 400);
  const carbs = n(body.remaining?.carbs, 800);
  const fat = n(body.remaining?.fat, 300);
  if (kcal === null || protein === null || carbs === null || fat === null) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const meal = (body.meal ?? "").slice(0, 30);
  const prefs = (body.preferences ?? "").slice(0, 200);

  const prompt = [
    "Eres un asistente de nutrición para una persona adulta sana en Chile.",
    `Le quedan hoy aproximadamente ${kcal} kcal, ${protein} g de proteína, ${carbs} g de carbohidratos y ${fat} g de grasa.`,
    meal ? `La próxima comida es: ${meal}.` : "",
    prefs ? `Preferencias del usuario: ${prefs}.` : "",
    "Propón 3 ideas de comidas simples con ingredientes comunes en Chile que se acerquen a esos valores sin superarlos.",
    "No des consejos médicos. Las cifras son estimaciones.",
    'Responde SOLO JSON: {"ideas":[{"nombre":string,"ingredientes":string[],"kcal":number,"proteina_g":number,"carbohidratos_g":number,"grasa_g":number}]}',
  ].filter(Boolean).join("\n");

  try {
    const text = await generateText(prompt, { json: true });
    const parsed = JSON.parse(text) as { ideas?: unknown };
    if (!Array.isArray(parsed.ideas)) throw new AiError("Respuesta de IA inválida", 502);
    return NextResponse.json({ ideas: parsed.ideas.slice(0, 3), estimated: true });
  } catch (err) {
    const status = err instanceof AiError ? err.status : 502;
    const message = err instanceof AiError ? err.message : "No se pudo generar sugerencias.";
    return NextResponse.json({ error: message }, { status });
  }
}
