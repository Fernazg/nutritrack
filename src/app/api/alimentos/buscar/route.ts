import { NextResponse, type NextRequest } from "next/server";
import { searchProducts } from "@/lib/server/openfoodfacts";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 80) {
    return NextResponse.json({ error: "Consulta inválida" }, { status: 400 });
  }
  try {
    const results = await searchProducts(q);
    return NextResponse.json(
      { results },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Open Food Facts no respondió. Inténtalo más tarde." },
      { status: 502 },
    );
  }
}
