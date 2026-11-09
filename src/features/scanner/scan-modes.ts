import { Barcode, Camera, FileText, type LucideIcon } from "lucide-react";

export type ScanMode = "foto" | "codigo" | "etiqueta";

export interface ScanModeConfig {
  mode: ScanMode;
  title: string;
  short: string;
  description: string;
  icon: LucideIcon;
  tips: string[];
}

export const SCAN_MODES: readonly ScanModeConfig[] = [
  {
    mode: "foto",
    title: "Foto de comida",
    short: "Foto IA",
    description: "Toma una foto de tu plato y estima calorías y macros.",
    icon: Camera,
    tips: [
      "Encuadra todo el plato desde arriba.",
      "Usa buena iluminación, idealmente natural.",
      "Separa los alimentos si es posible.",
    ],
  },
  {
    mode: "codigo",
    title: "Código de barras",
    short: "Código",
    description: "Escanea un producto envasado y revisa su información.",
    icon: Barcode,
    tips: [
      "Centra el código dentro del recuadro.",
      "Mantén el teléfono estable a unos 15 cm.",
      "Evita reflejos sobre el envase.",
    ],
  },
  {
    mode: "etiqueta",
    title: "Etiqueta nutricional",
    short: "Etiqueta",
    description: "Analiza la tabla nutricional y la lista de ingredientes.",
    icon: FileText,
    tips: [
      "Fotografía la tabla completa y legible.",
      "Incluye la lista de ingredientes si la hay.",
      "Aplana el envase para evitar curvaturas.",
    ],
  },
] as const;

export function getScanMode(mode: string): ScanModeConfig | undefined {
  return SCAN_MODES.find((m) => m.mode === mode);
}
