import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase server-only con la secret key (service_role).
 *
 * Bypassea RLS por completo, así que NUNCA se importa desde un componente
 * cliente. Sólo lo usan las API routes, y siempre después de validar quién
 * está pidiendo la operación.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

let admin = null;

export function getSupabaseAdmin() {
  if (admin) return admin;

  if (!url || !secretKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en el entorno",
    );
  }

  admin = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return admin;
}

/**
 * Cliente que actúa EN NOMBRE del usuario del JWT.
 *
 * Respeta RLS, así que es el que hay que usar para llamar RPCs que dependen
 * de auth.uid() (crear_compra, mis_compras, ...). Con el admin de arriba,
 * auth.uid() sería null.
 */
export function getSupabaseComoUsuario(accessToken) {
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Faltan las variables públicas de Supabase en el entorno");
  }

  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/**
 * Valida el header Authorization de un request y devuelve el usuario.
 * Devuelve null si no hay token o si es inválido/expirado.
 */
export async function usuarioDelRequest(request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) return { usuario: null, token: null };

  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data?.user) return { usuario: null, token: null };

  return { usuario: data.user, token };
}

/** ¿El usuario tiene rol editor o admin? Se lee de profiles, no del JWT. */
export async function esEditor(userId) {
  const { data, error } = await getSupabaseAdmin()
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error || !data) return false;
  return data.role === "editor" || data.role === "admin";
}
