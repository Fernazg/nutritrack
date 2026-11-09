import Link from "next/link";

export default function NotFound() {
  return (
    <main className="pt-safe flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="text-[15px] font-semibold">Página no encontrada</p>
      <Link href="/" className="mt-3 text-[15px] font-medium text-accent">
        Volver al inicio
      </Link>
    </main>
  );
}
