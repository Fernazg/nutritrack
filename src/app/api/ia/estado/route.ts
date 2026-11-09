import { NextResponse } from "next/server";
import { connection } from "next/server";
import { aiConfigured } from "@/lib/server/ai";

/** Tells the app whether the optional AI features can be shown. */
export async function GET() {
  await connection(); // read env at request time, not at build time
  return NextResponse.json({ configured: aiConfigured() }, { headers: { "Cache-Control": "no-store" } });
}
