import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { obtenerPago, validarFirmaWebhook } from "@/lib/mercadopago";

// crypto y el SDK de MP necesitan Node, no edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhook/mp
 *
 * Único lugar del sistema que puede marcar una compra como pagada.
 *
 * El orden de las defensas importa:
 *  1. Firma HMAC. Sin header válido -> 401. Falla CERRADO: un fail-open acá
 *     convierte esto en "regalate cualquier producto".
 *  2. Consultamos el pago a la API de MP con el id. El body no se cree nunca:
 *     sólo lo usamos para saber QUÉ preguntar.
 *  3. confirmar_pago es idempotente. MP reenvía la misma notificación varias
 *     veces y eso tiene que ser inocuo.
 *
 * Devolvemos 200 en casi todos los casos "esperables" para que MP deje de
 * reintentar; los 500 quedan sólo para fallas nuestras, donde el reintento
 * sí nos conviene.
 */
export async function POST(request) {
  const secret = process.env.MP_WEBHOOK_SECRET;

  const url = new URL(request.url);
  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  // El data.id puede venir en el body o como query param, según el tipo de
  // notificación. La firma se calcula sobre el de la query cuando existe.
  const dataId =
    url.searchParams.get("data.id") ??
    url.searchParams.get("id") ??
    body?.data?.id ??
    null;

  if (!validarFirmaWebhook({ xSignature, xRequestId, dataId, secret })) {
    console.warn("[webhook] firma inválida o ausente");
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  const tipo = body?.type ?? body?.topic ?? url.searchParams.get("type");

  // Sólo nos interesan los pagos. El resto (merchant_order, etc.) se acepta
  // y se descarta para que MP no reintente.
  if (tipo && tipo !== "payment") {
    return NextResponse.json({ ok: true, ignorado: tipo });
  }

  if (!dataId) {
    return NextResponse.json({ ok: true, ignorado: "sin data.id" });
  }

  let pago;
  try {
    pago = await obtenerPago(dataId);
  } catch (e) {
    console.error("[webhook] no pudimos consultar el pago:", e?.message ?? e);
    // Falla nuestra o de MP: que reintente.
    return NextResponse.json(
      { error: "No pudimos verificar el pago" },
      { status: 500 },
    );
  }

  const orderId = pago.externalReference;
  if (!orderId) {
    console.warn("[webhook] pago sin external_reference:", pago.id);
    return NextResponse.json({ ok: true, ignorado: "sin external_reference" });
  }

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.rpc("confirmar_pago", {
      p_order_id: orderId,
      p_payment_id: pago.id,
      p_status: pago.status,
    });

    if (error) {
      console.error("[webhook] confirmar_pago falló:", error.message);
      return NextResponse.json(
        { error: "No pudimos registrar el pago" },
        { status: 500 },
      );
    }

    const filas = Number(data ?? 0);
    console.log(
      `[webhook] pago ${pago.id} status=${pago.status} order=${orderId} filas=${filas}`,
    );

    return NextResponse.json({ ok: true, actualizadas: filas });
  } catch (e) {
    console.error("[webhook] error inesperado:", e?.message ?? e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/** MP a veces hace un GET de prueba al configurar la URL. */
export async function GET() {
  return NextResponse.json({ ok: true });
}
