import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buscarPagosPorReferencia, obtenerPago } from "@/lib/mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/reconfirm
 * Headers: x-admin-secret: <ADMIN_SECRET>
 * Body: { orderId } | { orderId, paymentId }
 *
 * Rescate manual de un pago. Escenario real: alguien pagó, Mercado Pago mandó
 * el webhook justo cuando el deploy estaba caído, y la compra quedó
 * 'pendiente' con el dinero ya cobrado. Sin esto habría que tocar la base a
 * mano, que es exactamente lo que no queremos hacer a las 11 de la noche.
 *
 * Igual que el webhook, NO confía en lo que le manden: consulta el estado
 * real a la API de Mercado Pago antes de confirmar nada.
 */
export async function POST(request) {
  const esperado = process.env.ADMIN_SECRET;
  if (!esperado) {
    return NextResponse.json(
      { error: "ADMIN_SECRET no configurado" },
      { status: 503 },
    );
  }

  const recibido = request.headers.get("x-admin-secret") ?? "";

  // Comparación en tiempo constante, por prolijidad.
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const orderId = body?.orderId;
  if (typeof orderId !== "string" || !orderId) {
    return NextResponse.json({ error: "Falta orderId" }, { status: 400 });
  }

  try {
    // El estado real lo dice MP, no el que llama a este endpoint.
    let pagos;
    if (body?.paymentId) {
      pagos = [await obtenerPago(String(body.paymentId))];
    } else {
      pagos = await buscarPagosPorReferencia(orderId);
    }

    const aprobado = pagos.find((p) => p.status === "approved");
    const elegido = aprobado ?? pagos[0];

    if (!elegido) {
      return NextResponse.json(
        { error: "Mercado Pago no tiene ningún pago para esa orden.", pagos: [] },
        { status: 404 },
      );
    }

    if (elegido.externalReference && elegido.externalReference !== orderId) {
      return NextResponse.json(
        { error: "Ese pago pertenece a otra orden." },
        { status: 409 },
      );
    }

    const { data, error } = await getSupabaseAdmin().rpc("confirmar_pago", {
      p_order_id: orderId,
      p_payment_id: elegido.id,
      p_status: elegido.status,
    });

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      orderId,
      paymentId: elegido.id,
      status: elegido.status,
      actualizadas: Number(data ?? 0),
      pagosEncontrados: pagos.length,
    });
  } catch (e) {
    console.error("[reconfirm] falló:", e?.message ?? e);
    return NextResponse.json(
      { error: "No pudimos reconfirmar el pago." },
      { status: 500 },
    );
  }
}
