import { createClient } from "@supabase/supabase-js";

/**
 * Lecturas server-side para las páginas públicas.
 *
 * Usa la publishable key SIN sesión, o sea que entra como `anon` y RLS la
 * limita a lo que ve un visitante: productos activos, talleres visibles y los
 * textos del sitio. Es exactamente lo que queremos indexar.
 *
 * Las páginas que llaman a estas funciones declaran `revalidate`, así que el
 * HTML se genera estático y se refresca cada tanto: la landing carga sin
 * esperar a la base y sin gastar egress de Supabase en cada visita.
 */

function clienteAnonimo() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Textos editables, como objeto plano { clave: valor }.
 * Si la base no está configurada todavía devuelve {} y cada EditableText cae
 * en su fallback, así el sitio se puede ver y buildear sin Supabase.
 */
export async function getTextos() {
  const supabase = clienteAnonimo();
  if (!supabase) return {};

  const { data, error } = await supabase.from("site_settings").select("key, value");
  if (error || !data) return {};

  return Object.fromEntries(data.map((fila) => [fila.key, fila.value]));
}

/** Catálogo activo, ordenado. */
export async function getProductos() {
  const supabase = clienteAnonimo();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("productos")
    .select(
      "id, slug, titulo, nombre_corto, subtitulo, descripcion, autor, portada_path, precio, precio_lista, paginas, indice, indice_titulo, destacado",
    )
    .eq("activo", true)
    .order("orden", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data;
}

/** Un producto por slug, o null si no existe / está en borrador. */
export async function getProducto(slug) {
  const supabase = clienteAnonimo();
  if (!supabase || !slug) return null;

  const { data, error } = await supabase
    .from("productos")
    .select(
      "id, slug, titulo, nombre_corto, subtitulo, descripcion, autor, portada_path, precio, precio_lista, paginas, indice, indice_titulo",
    )
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle();

  if (error) return null;
  return data ?? null;
}

/** El producto destacado, que es el que protagoniza la landing. */
export async function getProductoDestacado() {
  const productos = await getProductos();
  if (productos.length === 0) return null;
  return productos.find((p) => p.destacado) ?? productos[0];
}

/** Talleres visibles, los más recientes primero. */
export async function getTalleres() {
  const supabase = clienteAnonimo();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("talleres")
    .select("id, titulo, descripcion, lugar, fecha, imagen_path")
    .eq("visible", true)
    .order("orden", { ascending: true })
    .order("fecha", { ascending: false, nullsFirst: false });

  if (error || !data) return [];
  return data;
}

/**
 * Helper de lectura de textos con fallback.
 * `t(textos, 'hero_titulo', 'Título por defecto')`
 */
export function t(textos, clave, fallback = "") {
  const valor = textos?.[clave];
  if (valor === null || valor === undefined || valor === "") return fallback;
  return valor;
}
