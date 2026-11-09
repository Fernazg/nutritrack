import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ScanScreen } from "@/features/scanner/scan-screen";
import { SCAN_MODES, getScanMode } from "@/features/scanner/scan-modes";

export function generateStaticParams() {
  return SCAN_MODES.map((m) => ({ modo: m.mode }));
}

export async function generateMetadata({ params }: PageProps<"/escanear/[modo]">) {
  const { modo } = await params;
  return { title: getScanMode(modo)?.title ?? "Escanear" };
}

export default function ScanModePage({ params }: PageProps<"/escanear/[modo]">) {
  return (
    <Suspense>
      <ScanContent params={params} />
    </Suspense>
  );
}

async function ScanContent({ params }: { params: Promise<{ modo: string }> }) {
  const { modo } = await params;
  const config = getScanMode(modo);
  if (!config) notFound();
  return <ScanScreen config={config} />;
}
