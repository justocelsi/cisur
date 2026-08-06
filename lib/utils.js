/**
 * Utilidades puras. Todo lo de acá está testeado en utils.test.js porque es
 * donde se esconden los agujeros de seguridad (XSS por href, open redirect).
 */

/** Formatea un precio en pesos argentinos. 19900 -> "$ 19.900" */
export function formatearPrecio(valor) {
  // Number(null) y Number("") dan 0, que es finito: hay que descartarlos
  // antes o un precio ausente se mostraría como "$ 0".
  if (valor === null || valor === undefined || valor === "") return "";
  const n = Number(valor);
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Fecha larga en castellano. "2026-07-29" -> "29 de julio de 2026" */
export function formatearFecha(valor) {
  if (!valor) return "";
  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(d);
}

/** Fecha + hora, para el panel de ventas. */
export function formatearFechaHora(valor) {
  if (!valor) return "";
  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(d);
}

const ESQUEMAS_PERMITIDOS = ["http:", "https:", "mailto:", "tel:"];

/**
 * Sanitiza una URL que viene de la base de datos antes de ponerla en un href.
 * Sin esto, un editor comprometido podría guardar "javascript:..." y ejecutar
 * código en el navegador de cualquier visitante.
 */
export function safeHref(valor) {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  if (!limpio) return null;

  // Relativas propias: siempre OK.
  if (limpio.startsWith("/") && !limpio.startsWith("//")) return limpio;
  if (limpio.startsWith("#")) return limpio;

  try {
    const url = new URL(limpio);
    if (!ESQUEMAS_PERMITIDOS.includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitiza un ?next= de redirect después del login.
 * Sólo rutas internas: evita que un mail de phishing mande a
 * /ingresar?next=https://sitio-falso.com y el login termine ahí.
 */
export function safeNextPath(valor, porDefecto = "/mis-materiales") {
  if (typeof valor !== "string") return porDefecto;
  const limpio = valor.trim();
  if (!limpio.startsWith("/")) return porDefecto;
  if (limpio.startsWith("//")) return porDefecto;
  if (limpio.includes("\\")) return porDefecto;
  // Un backslash o un ":" antes del primer "/" podrían colar un esquema.
  if (/^\/[^/]*:/.test(limpio)) return porDefecto;
  return limpio;
}

/**
 * Lee un entero de pesos de lo que sea que hayan escrito en el panel.
 *
 * Devuelve null si no queda un entero limpio, para que quien llama corte con un
 * mensaje en vez de guardar cualquier cosa.
 *
 * NO adivina, y eso es a propósito. «25.000» es como escribe un precio
 * cualquier persona en Argentina, pero para HTML y para JavaScript el punto es
 * el separador DECIMAL: `Number("25.000")` es 25. El `<input type="number">` lo
 * acepta sin chistar. Así, un material de veinticinco mil pesos salía a la
 * venta a veinticinco, el trigger lo copiaba a la compra y Mercado Pago cobraba
 * eso. Interpretar el punto como separador de miles sería adivinar en la otra
 * dirección: mejor rechazarlo y decir cómo se escribe.
 */
export function enteroDePesos(crudo) {
  const texto = String(crudo ?? "").trim();
  if (!/^\d+$/.test(texto)) return null;
  const n = Number(texto);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}

/** Normaliza un título a slug para la URL del producto. */
export function slugify(texto) {
  if (typeof texto !== "string") return "";
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Link de WhatsApp con mensaje prellenado. */
export function linkWhatsApp(numero, mensaje = "") {
  const soloDigitos = String(numero ?? "").replace(/\D/g, "");
  if (!soloDigitos) return null;
  const base = `https://wa.me/${soloDigitos}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

/**
 * URL de una imagen del sitio.
 *
 * Dos orígenes posibles:
 *   · empieza con "/"  → un archivo de public/, versionado en el repo.
 *   · cualquier otra   → el bucket 'publico' de Supabase Storage, subido desde
 *                        el panel.
 *
 * Así una portada puede venir con el proyecto y después ser reemplazada por
 * Tati sin que haya que tocar código.
 */
export function urlPublica(path) {
  if (!path) return null;

  const texto = String(path).trim();
  if (!texto) return null;

  if (texto.startsWith("/")) return texto;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/publico/${texto}`;
}

/**
 * URL absoluta de una imagen, para los datos estructurados.
 * urlPublica() puede devolver una ruta relativa (public/) o una absoluta
 * (Supabase); Google necesita siempre una absoluta.
 */
export function urlPublicaAbsoluta(path) {
  const url = urlPublica(path);
  if (!url) return null;
  return url.startsWith("/") ? `${urlSitio()}${url}` : url;
}

/** El dominio del sitio, sin barra final. */
export function urlSitio() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://cisur.vercel.app";
  return raw.replace(/\/+$/, "");
}
