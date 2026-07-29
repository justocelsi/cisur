/**
 * Traduce los errores de Supabase/Mercado Pago a algo que una mamá cansada a
 * las 11 de la noche pueda entender. Nada de "invalid_grant" en pantalla.
 */

const MENSAJES = [
  [
    /invalid login credentials/i,
    "El mail o la contraseña no coinciden. Revisá y probá de nuevo.",
  ],
  [
    /email not confirmed/i,
    "Todavía no confirmaste tu mail. Buscá el mail que te enviamos (mirá también en spam).",
  ],
  [
    /user already registered|already been registered/i,
    "Ya existe una cuenta con ese mail. Probá iniciar sesión o recuperar la contraseña.",
  ],
  [
    /password should be at least/i,
    "La contraseña tiene que tener al menos 6 caracteres.",
  ],
  [
    /unable to validate email|invalid email/i,
    "Ese mail no parece válido. Revisá que esté bien escrito.",
  ],
  [
    /for security purposes|rate limit|too many requests/i,
    "Hicimos demasiados intentos seguidos. Esperá un minuto y volvé a probar.",
  ],
  [
    /email rate limit exceeded/i,
    "Se alcanzó el límite de mails por hora. Esperá un rato y volvé a intentar.",
  ],
  [
    /ya tenés acceso/i,
    "Ya tenés acceso a este material. Buscalo en «Mis materiales».",
  ],
  [
    /tenés que iniciar sesión/i,
    "Necesitás iniciar sesión para poder comprar.",
  ],
  [
    /no está disponible|no existe/i,
    "Ese material no está disponible en este momento.",
  ],
  [
    /new row violates row-level security|permission denied|insufficient_privilege/i,
    "No tenés permiso para hacer eso.",
  ],
  [
    /duplicate key|already exists/i,
    "Eso ya existe. Probá con otro nombre.",
  ],
  [
    /failed to fetch|networkerror|network request failed/i,
    "No pudimos conectarnos. Revisá tu conexión a internet y probá de nuevo.",
  ],
];

const GENERICO =
  "Algo no salió como esperábamos. Probá de nuevo en un momento.";

export function mensajeDeError(error) {
  if (!error) return GENERICO;

  const texto =
    typeof error === "string"
      ? error
      : (error.message ?? error.error_description ?? error.msg ?? "");

  if (!texto) return GENERICO;

  for (const [patron, mensaje] of MENSAJES) {
    if (patron.test(texto)) return mensaje;
  }

  return GENERICO;
}
