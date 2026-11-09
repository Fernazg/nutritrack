import type { Metadata } from "next";
import { ScannerHub } from "@/features/scanner/scanner-hub";

export const metadata: Metadata = { title: "Escanear" };

export default function ScanPage() {
  return <ScannerHub />;
}
