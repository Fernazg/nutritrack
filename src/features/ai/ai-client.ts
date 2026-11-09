"use client";

import { useEffect, useState } from "react";
import type { PhotoAnalysis } from "@/lib/nutrition/photo";

const TOKEN_KEY = "nutritrack.aiToken";

/** The access token lives only on this device (it unlocks your own AI quota). */
export function getAiToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setAiToken(token: string) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable (private mode) */
  }
}

/** null while checking; false when the server has no AI configured or offline. */
export function useAiConfigured(): boolean | null {
  const [configured, setConfigured] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    fetch("/api/ia/estado")
      .then((r) => (r.ok ? r.json() : { configured: false }))
      .then((d: { configured?: boolean }) => active && setConfigured(!!d.configured))
      .catch(() => active && setConfigured(false));
    return () => {
      active = false;
    };
  }, []);
  return configured;
}

export interface AiIdea {
  nombre: string;
  ingredientes?: string[];
  kcal?: number;
  proteina_g?: number;
  carbohidratos_g?: number;
  grasa_g?: number;
}

export async function fetchAiIdeas(body: {
  remaining: { calories: number; protein: number; carbs: number; fat: number };
  meal?: string;
}): Promise<AiIdea[]> {
  let res: Response;
  try {
    res = await fetch("/api/ia/sugerencias", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-app-token": getAiToken() },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Sin conexión.");
  }
  const data = (await res.json().catch(() => ({}))) as { ideas?: AiIdea[]; error?: string };
  if (!res.ok) throw new Error(res.status === 401 ? "Token de acceso incorrecto. Revísalo en Ajustes." : data.error ?? "Error de IA.");
  return (data.ideas ?? []).filter((i) => typeof i?.nombre === "string");
}

/** Shrinks a photo (EXIF-aware) to a JPEG small enough to upload quickly. */
export async function photoToJpegBase64(file: Blob, maxSide = 1280, quality = 0.8): Promise<{ base64: string; previewUrl: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return { base64: dataUrl.slice(dataUrl.indexOf(",") + 1), previewUrl: dataUrl };
}

export async function analyzeMealPhoto(base64: string): Promise<PhotoAnalysis> {
  let res: Response;
  try {
    res = await fetch("/api/ia/foto", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-app-token": getAiToken() },
      body: JSON.stringify({ image: base64, mimeType: "image/jpeg" }),
    });
  } catch {
    throw new Error("Sin conexión. El análisis de fotos necesita internet.");
  }
  const data = (await res.json().catch(() => ({}))) as PhotoAnalysis & { error?: string };
  if (!res.ok) throw new Error(res.status === 401 ? "Token de acceso incorrecto. Revísalo en Ajustes." : data.error ?? "Error de IA.");
  return { isFood: !!data.isFood, items: Array.isArray(data.items) ? data.items : [], note: data.note };
}
