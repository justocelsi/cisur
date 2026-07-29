import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/keep-alive
 *
 * Una query trivial por día para que el proyecto Supabase del plan free no se
 * pause tras una semana sin actividad. Sin esto, si en una semana no compra
 * nadie, el sitio amanece caído.
 *
 * Lo dispara el cron de Vercel (ver vercel.json), que manda el CRON_SECRET
 * como Bearer.
 */
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";

  // Sin secreto configurado no atendemos: mejor un cron que falla ruidosamente
  // que un endpoint abierto.
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET no configurado" },
      { status: 503 },
    );
  }

  if (header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { count, error } = await getSupabaseAdmin()
      .from("productos")
      .select("id", { count: "exact", head: true });

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      productos: count ?? 0,
      cuando: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[keep-alive] falló:", e?.message ?? e);
    return NextResponse.json({ error: "Falló el ping" }, { status: 500 });
  }
}
