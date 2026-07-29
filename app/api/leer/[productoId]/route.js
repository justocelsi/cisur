import { NextResponse } from "next/server";
import { esEditor, getSupabaseAdmin, usuarioDelRequest } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Una hora: alcanza de sobra para leer un capítulo y no sirve para armar un
// link permanente que se comparta por WhatsApp.
const TTL_SEGUNDOS = 60 * 60;

/**
 * GET /api/leer/:productoId
 *
 * Devuelve una URL firmada del PDF, sólo si el usuario tiene una compra
 * pagada de ese producto (o es editor).
 *
 * La verificación se hace acá con la secret key, y ADEMÁS la policy de
 * Storage la repite en la base (0005). Redundante a propósito: si un día
 * alguien agrega otro camino al archivo, la policy sigue tapando el agujero.
 */
export async function GET(request, { params }) {
  const { productoId } = await params;

  const { usuario } = await usuarioDelRequest(request);
  if (!usuario) {
    return NextResponse.json(
      { error: "Necesitás iniciar sesión." },
      { status: 401 },
    );
  }

  if (typeof productoId !== "string" || !productoId) {
    return NextResponse.json({ error: "Falta el material." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: producto, error: errorProducto } = await admin
    .from("productos")
    .select("id, titulo, archivo_path, paginas")
    .eq("id", productoId)
    .maybeSingle();

  if (errorProducto || !producto) {
    return NextResponse.json(
      { error: "Ese material no existe." },
      { status: 404 },
    );
  }

  // ¿Compró, o es Tati?
  const { count, error: errorCompra } = await admin
    .from("compras")
    .select("id", { count: "exact", head: true })
    .eq("user_id", usuario.id)
    .eq("producto_id", productoId)
    .eq("estado", "pagada");

  if (errorCompra) {
    console.error("[leer] no pudimos verificar la compra:", errorCompra.message);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }

  const compro = (count ?? 0) > 0;
  const editor = compro ? false : await esEditor(usuario.id);

  if (!compro && !editor) {
    return NextResponse.json(
      { error: "Todavía no tenés acceso a este material." },
      { status: 403 },
    );
  }

  if (!producto.archivo_path) {
    return NextResponse.json(
      { error: "El archivo de este material todavía no está cargado." },
      { status: 409 },
    );
  }

  const { data: firmada, error: errorFirma } = await admin.storage
    .from("guias")
    .createSignedUrl(producto.archivo_path, TTL_SEGUNDOS);

  if (errorFirma || !firmada?.signedUrl) {
    console.error(
      "[leer] no pudimos firmar la URL:",
      errorFirma?.message ?? "sin signedUrl",
    );
    return NextResponse.json(
      { error: "No pudimos abrir el material. Probá de nuevo." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      url: firmada.signedUrl,
      titulo: producto.titulo,
      paginas: producto.paginas,
      expiraEn: TTL_SEGUNDOS,
      soloVistaPrevia: !compro && editor,
    },
    // Que ningún proxy ni el navegador cachee una URL firmada.
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
