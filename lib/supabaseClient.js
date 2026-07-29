import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase para el navegador.
 *
 * Usa la publishable key, que viaja en el bundle a la vista de todos. Eso
 * está bien: lo que limita qué puede leer y escribir cada usuario es RLS
 * en Postgres, no el secreto de esta clave.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let cliente = null;

export function getSupabase() {
  if (cliente) return cliente;

  if (!url || !publishableKey) {
    // En build time / preview sin env vars no queremos tirar el proceso abajo.
    // Los providers manejan el null mostrando el sitio en modo sólo lectura.
    if (typeof window !== "undefined") {
      console.error(
        "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      );
    }
    return null;
  }

  cliente = createClient(url, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return cliente;
}

/** Token de acceso actual, para mandarlo como Bearer a las API routes. */
export async function getAccessToken() {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token ?? null;
}

/** fetch a una API route propia, ya autenticado. */
export async function fetchAutenticado(url, opciones = {}) {
  const token = await getAccessToken();
  return fetch(url, {
    ...opciones,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opciones.headers ?? {}),
    },
  });
}
