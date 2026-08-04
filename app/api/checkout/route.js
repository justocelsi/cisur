import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  getSupabaseComoUsuario,
  usuarioDelRequest,
} from "@/lib/supabaseAdmin";
import { crearPreferencia } from "@/lib/mercadopago";
import { urlSitio } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/checkout
 * Body: { productoId }
 *
 * Crea la compra en estado 'pendiente' y devuelve la URL de Mercado Pago.
 *
 * Dos cosas no negociables acá:
 *  - El usuario sale del JWT, nunca del body: no se puede comprar en nombre
 *    de otro.
 *  - El precio sale de la base (lo snapshotea un trigger), nunca del body: no
 *    se puede pagar $1 por algo de $19.900.
 */
export async function POST(request) {
  const { usuario, token } = await usuarioDelRequest(request);
  if (!usuario) {
    return NextResponse.json(
      { error: "Tenés que iniciar sesión para comprar." },
      { status: 401 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const productoId = body?.productoId;
  if (typeof productoId !== "string" || !productoId) {
    return NextResponse.json(
      { error: "Falta indicar qué material querés comprar." },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();

  const { data: producto, error: errorProducto } = await admin
    .from("productos")
    .select("id, slug, titulo, precio, activo")
    .eq("id", productoId)
    .maybeSingle();

  if (errorProducto || !producto) {
    return NextResponse.json(
      { error: "Ese material no existe." },
      { status: 404 },
    );
  }

  if (!producto.activo) {
    return NextResponse.json(
      { error: "Ese material no está disponible en este momento." },
      { status: 409 },
    );
  }

  // crear_compra corre con el JWT del usuario, así auth.uid() es él.
  const comoUsuario = getSupabaseComoUsuario(token);
  const { data: filas, error: errorCompra } = await comoUsuario.rpc(
    "crear_compra",
    { p_producto_id: productoId, p_metodo_pago: "mercadopago" },
  );

  if (errorCompra) {
    const mensaje = errorCompra.message ?? "";
    // Ya la compró: no es un error del sistema, es un 409 que el botón
    // traduce a "andá a leerlo".
    if (/ya ten[eé]s acceso/i.test(mensaje)) {
      return NextResponse.json(
        { error: "Ya tenés acceso a este material.", yaComprado: true },
        { status: 409 },
      );
    }
    console.error("[checkout] crear_compra falló:", mensaje);
    return NextResponse.json(
      { error: "No pudimos iniciar la compra. Probá de nuevo." },
      { status: 500 },
    );
  }

  const compra = Array.isArray(filas) ? filas[0] : filas;
  if (!compra?.order_id) {
    console.error("[checkout] crear_compra no devolvió order_id");
    return NextResponse.json(
      { error: "No pudimos iniciar la compra. Probá de nuevo." },
      { status: 500 },
    );
  }

  try {
    const { initPoint, sandboxInitPoint } = await crearPreferencia({
      orderId: compra.order_id,
      titulo: producto.titulo,
      // El precio que se cobra es el que quedó snapshoteado en la base.
      precio: compra.precio_pagado,
      emailComprador: usuario.email,
      siteUrl: urlSitio(),
    });

    // Las credenciales TEST- viejas sólo aceptaban pagos por el sandbox.
    //
    // Este chequeo ya no alcanza para saber si estamos en modo prueba: el
    // panel actual de MP entrega credenciales de prueba con prefijo APP_USR-,
    // atadas a un usuario TESTUSER…, y ahí esto da false. No se arregla desde
    // el string —son indistinguibles— y tampoco hace falta: para esas
    // credenciales la documentación de MP manda al init_point normal, que es
    // lo que devuelve esta rama. El sandbox_init_point queda como camino de
    // compatibilidad para un token TEST-.
    const esPrueba = String(process.env.MP_ACCESS_TOKEN ?? "").startsWith("TEST-");
    const destino = esPrueba ? (sandboxInitPoint ?? initPoint) : initPoint;

    return NextResponse.json({
      initPoint: destino,
      orderId: compra.order_id,
    });
  } catch (e) {
    console.error("[checkout] Mercado Pago falló:", e?.message ?? e);

    // La compra pendiente queda huérfana: la cancelamos para no bloquear el
    // próximo intento (aunque crear_compra ya limpia pendientes, dejarla
    // colgada ensucia el panel de ventas).
    await admin
      .from("compras")
      .update({ estado: "cancelada" })
      .eq("id", compra.compra_id)
      .eq("estado", "pendiente");

    return NextResponse.json(
      { error: "No pudimos conectarnos con Mercado Pago. Probá de nuevo." },
      { status: 502 },
    );
  }
}
