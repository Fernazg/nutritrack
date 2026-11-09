import { NextResponse } from "next/server";
import { getProductByBarcode } from "@/lib/server/openfoodfacts";

export async function GET(_req: Request, ctx: RouteContext<"/api/alimentos/codigo/[codigo]">) {
  const { codigo } = await ctx.params;
  if (!/^\d{6,14}$/.test(codigo)) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }
  try {
    const product = await getProductByBarcode(codigo);
    if (!product) {
      return NextResponse.json(
        { product: null },
        { status: 404, headers: { "Cache-Control": "public, s-maxage=3600" } },
      );
    }
    return NextResponse.json(
      { product },
      { headers: { "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=2592000" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Open Food Facts no respondió. Inténtalo más tarde." },
      { status: 502 },
    );
  }
}
