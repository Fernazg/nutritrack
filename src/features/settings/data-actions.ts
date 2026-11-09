"use client";

import { exportAll } from "@/lib/db/repository";
import { toISODate } from "@/lib/date";

/**
 * Exports all local data as JSON. On iPhone the share sheet is used
 * (save to Files, AirDrop…); elsewhere it falls back to a download.
 */
export async function exportDataFile(): Promise<"shared" | "downloaded" | "cancelled"> {
  const data = await exportAll();
  const name = `nutritrack-${toISODate(new Date())}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const file = new File([blob], name, { type: "application/json" });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Datos de NutriTrack" });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
      // fall through to download
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
