#!/usr/bin/env node
/**
 * Verifica las credenciales de Mercado Pago ANTES de mover plata.
 *
 *   node scripts/verificar-mp.mjs
 *
 * Contesta tres preguntas, en orden de importancia:
 *
 *   1. ¿El Access Token es válido?
 *   2. ¿DE QUIÉN ES LA CUENTA a la que va a entrar el dinero?  ← la que importa
 *   3. ¿Puede crear cobros? (crea una preferencia de prueba y la descarta)
 *
 * La segunda es la razón de ser de este script. Una credencial pegada mal, o
 * la de otra aplicación, falla de la peor manera posible: todo parece andar y
 * la plata cae en la cuenta equivocada. Preguntárselo a la API de MP cuesta
 * una llamada; descubrirlo después cuesta una conversación incómoda.
 *
 * No imprime ningún secreto: sólo prefijos y longitudes.
 */

import { readFileSync } from "node:fs";

const API = "https://api.mercadopago.com";

// --- leer .env.local sin dependencias -------------------------------------
function leerEnv(ruta = ".env.local") {
  let texto;
  try {
    texto = readFileSync(ruta, "utf8");
  } catch {
    salir(`No encontré ${ruta}. Copiá .env.example y completalo.`);
  }
  const env = {};
  for (const linea of texto.split("\n")) {
    const m = linea.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const ok = (s) => console.log(`  \x1b[32m✓\x1b[0m ${s}`);
const mal = (s) => console.log(`  \x1b[31m✗\x1b[0m ${s}`);
const nota = (s) => console.log(`    \x1b[2m${s}\x1b[0m`);
const salir = (s) => {
  console.error(`\n\x1b[31m${s}\x1b[0m\n`);
  process.exit(1);
};

const huella = (v) => `${v.slice(0, 12)}…${v.slice(-4)} (${v.length} caracteres)`;

// --- 1. formato ------------------------------------------------------------
const env = leerEnv();
const token = env.MP_ACCESS_TOKEN ?? "";
const publicKey = env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? "";
const secret = env.MP_WEBHOOK_SECRET ?? "";

console.log("\n\x1b[1mCredenciales de Mercado Pago\x1b[0m\n");

if (!token) salir("MP_ACCESS_TOKEN está vacío en .env.local.");

const modo = token.startsWith("TEST-")
  ? "prueba"
  : token.startsWith("APP_USR-")
    ? "producción"
    : null;

if (!modo) {
  mal("MP_ACCESS_TOKEN no empieza con TEST- ni con APP_USR-.");
  nota(`empieza con: ${token.slice(0, 12)}…`);
  nota("Probablemente se pegó cortado, o es la Public Key en vez del token.");
  process.exit(1);
}
ok(`Access Token en modo \x1b[1m${modo}\x1b[0m — ${huella(token)}`);

if (!publicKey) {
  mal("NEXT_PUBLIC_MP_PUBLIC_KEY está vacía.");
} else {
  const modoPk = publicKey.startsWith("TEST-")
    ? "prueba"
    : publicKey.startsWith("APP_USR-")
      ? "producción"
      : null;
  if (modoPk !== modo) {
    mal(`La Public Key es de ${modoPk ?? "formato desconocido"} y el token de ${modo}.`);
    nota("Tienen que ser del mismo par: o las dos de prueba, o las dos de producción.");
  } else {
    ok(`Public Key en modo ${modoPk} — ${huella(publicKey)}`);
  }
}

if (!secret) {
  mal("MP_WEBHOOK_SECRET está vacío: el webhook va a rechazar TODO con 401.");
  nota("Sin esto la persona paga y nunca recibe el material.");
} else {
  ok(`Clave del webhook cargada — ${secret.length} caracteres`);
}

// --- 2. de quién es la cuenta ---------------------------------------------
console.log("\n\x1b[1mA qué cuenta entra la plata\x1b[0m\n");

const cabeceras = { Authorization: `Bearer ${token}` };

let cuenta;
try {
  const r = await fetch(`${API}/users/me`, { headers: cabeceras });
  if (!r.ok) {
    mal(`Mercado Pago rechazó el token (HTTP ${r.status}).`);
    nota(await r.text().then((t) => t.slice(0, 200)));
    nota("Si es 401: el token está mal copiado o fue revocado.");
    process.exit(1);
  }
  cuenta = await r.json();
} catch (e) {
  salir(`No pude conectarme con Mercado Pago: ${e.message}`);
}

ok(`Titular: \x1b[1m${cuenta.first_name ?? ""} ${cuenta.last_name ?? ""}\x1b[0m`.trimEnd());
ok(`Mail: ${cuenta.email ?? "—"}`);
ok(`Usuario: ${cuenta.nickname ?? "—"}  ·  id ${cuenta.id}`);
ok(`País: ${cuenta.site_id ?? "—"}${cuenta.site_id === "MLA" ? " (Argentina)" : ""}`);

if (modo === "producción") {
  console.log(
    "\n  \x1b[33m→ Confirmá que ese nombre y ese mail son los de Tatiana.\x1b[0m",
  );
  console.log("    \x1b[2mSi no lo son, la plata de cada venta cae ahí.\x1b[0m");
}

// --- 3. ¿puede cobrar? -----------------------------------------------------
console.log("\n\x1b[1m¿Puede generar cobros?\x1b[0m\n");

const sitio = env.NEXT_PUBLIC_SITE_URL || "https://cisur.vercel.app";

try {
  const r = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: { ...cabeceras, "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [
        {
          id: "verificacion",
          title: "Verificación de credenciales (no se cobra)",
          quantity: 1,
          unit_price: 1,
          currency_id: "ARS",
        },
      ],
      external_reference: "verificacion-cisur",
      notification_url: `${sitio}/api/webhook/mp`,
    }),
  });

  const datos = await r.json();
  if (!r.ok) {
    mal(`No pudo crear una preferencia (HTTP ${r.status}).`);
    nota(datos.message ?? JSON.stringify(datos).slice(0, 200));
    nota("Suele ser que la aplicación no está configurada como Checkout Pro.");
    process.exit(1);
  }

  ok("Creó una preferencia de prueba correctamente.");
  nota("Nadie la va a pagar: queda ahí y vence sola. No cobra nada.");

  if (modo === "prueba" && !datos.sandbox_init_point) {
    mal("El token es TEST- pero MP no devolvió sandbox_init_point.");
    nota("El checkout de prueba puede no abrir. Revisá las credenciales.");
  }
} catch (e) {
  salir(`Falló la llamada a Mercado Pago: ${e.message}`);
}

// --- resumen ---------------------------------------------------------------
console.log(
  `\n\x1b[1mListo.\x1b[0m Credenciales de \x1b[1m${modo}\x1b[0m, válidas, sobre la cuenta de ${cuenta.nickname ?? cuenta.id}.`,
);
console.log(
  `\x1b[2mFalta cargar estas mismas tres variables en Vercel y redeployar.\x1b[0m\n`,
);
