#!/usr/bin/env node
/**
 * Verifica las credenciales de Mercado Pago ANTES de mover plata.
 *
 *   npm run verificar:mp
 *
 * Contesta cuatro preguntas, en orden de gravedad:
 *
 *   1. ¿Están cambiadas de lugar?  ← la peor, y la más fácil de cometer
 *   2. ¿Son de prueba o de verdad?
 *   3. ¿DE QUIÉN ES LA CUENTA a la que va a entrar el dinero?
 *   4. ¿Puede generar cobros?
 *
 * Sobre la primera: la Public Key y el Access Token empiezan las dos con
 * APP_USR- y se distinguen sólo por el largo. Pegarlas al revés pone el
 * Access Token —que es un secreto— en una variable NEXT_PUBLIC_, y todo lo
 * que lleva ese prefijo se hornea en el bundle y se sirve a cada visitante.
 * El error no da ningún síntoma: los cobros funcionan igual.
 *
 * Sobre la segunda: en el panel actual de Mercado Pago las credenciales de
 * prueba TAMBIÉN empiezan con APP_USR-. Mirar el prefijo no alcanza; hay que
 * preguntarle a la API de quién es la cuenta y ver si es un usuario de test.
 *
 * No imprime ningún secreto: sólo prefijos y longitudes.
 */

import { readFileSync } from "node:fs";

const API = "https://api.mercadopago.com";

const ok = (s) => console.log(`  \x1b[32m✓\x1b[0m ${s}`);
const mal = (s) => console.log(`  \x1b[31m✗\x1b[0m ${s}`);
const ojo = (s) => console.log(`  \x1b[33m!\x1b[0m ${s}`);
const nota = (s) => console.log(`    \x1b[2m${s}\x1b[0m`);
const titulo = (s) => console.log(`\n\x1b[1m${s}\x1b[0m\n`);
const salir = (s) => {
  console.error(`\n\x1b[31m${s}\x1b[0m\n`);
  process.exit(1);
};

const huella = (v) => `${v.slice(0, 12)}…${v.slice(-4)} · ${v.length} caracteres`;

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

/** Le pregunta a MP de quién es la credencial. null si no la acepta. */
async function quienEs(credencial) {
  if (!credencial) return null;
  try {
    const r = await fetch(`${API}/users/me`, {
      headers: { Authorization: `Bearer ${credencial}` },
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d?.id ? d : null;
  } catch {
    return null;
  }
}

// Acepta otra ruta como argumento: sirve para revisar un archivo de variables
// antes de pegarlo en Vercel, y para probar este script contra casos armados.
const env = leerEnv(process.argv[2] ?? ".env.local");
let token = env.MP_ACCESS_TOKEN ?? "";
let publicKey = env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? "";
const secret = env.MP_WEBHOOK_SECRET ?? "";

// --- 1. formato y orden ----------------------------------------------------
titulo("Las tres variables");

if (!token && !publicKey) {
  salir("MP_ACCESS_TOKEN y NEXT_PUBLIC_MP_PUBLIC_KEY están vacías en .env.local.");
}

const prefijoValido = (v) => v.startsWith("TEST-") || v.startsWith("APP_USR-");
for (const [nombre, v] of [
  ["MP_ACCESS_TOKEN", token],
  ["NEXT_PUBLIC_MP_PUBLIC_KEY", publicKey],
]) {
  if (v && !prefijoValido(v)) {
    mal(`${nombre} no empieza con TEST- ni con APP_USR-.`);
    nota(`empieza con: ${v.slice(0, 14)}…`);
    nota("Se pegó cortado, o quedó una comilla o un espacio de más.");
    process.exit(1);
  }
}

let cuenta = await quienEs(token);

// El Access Token es el único de los dos que la API acepta. Si el que anda es
// el que está en la variable NEXT_PUBLIC_, están al revés.
if (!cuenta) {
  const cruzada = await quienEs(publicKey);
  if (cruzada) {
    console.log(
      "\n\x1b[41m\x1b[97m  ESTÁN CAMBIADAS DE LUGAR  \x1b[0m\n",
    );
    mal("El Access Token está en NEXT_PUBLIC_MP_PUBLIC_KEY.");
    nota(
      "Todo lo que empieza con NEXT_PUBLIC_ se hornea en el bundle y se sirve",
    );
    nota("a cada visitante del sitio. El Access Token es un secreto.");
    console.log("\n  Intercambialas en .env.local:\n");
    nota(`MP_ACCESS_TOKEN            ← el largo  (${publicKey.length} caracteres)`);
    nota(`NEXT_PUBLIC_MP_PUBLIC_KEY  ← el corto  (${token.length} caracteres)`);
    console.log(
      "\n  \x1b[33mSi ya las cargaste así en Vercel, rotá el Access Token en Mercado Pago.\x1b[0m\n",
    );
    process.exit(1);
  }
  mal("Mercado Pago no acepta MP_ACCESS_TOKEN.");
  nota("Está mal copiado, o fue revocado desde el panel de desarrolladores.");
  process.exit(1);
}

ok(`Access Token válido — ${huella(token)}`);

if (!publicKey) {
  ojo("NEXT_PUBLIC_MP_PUBLIC_KEY está vacía.");
  nota("Hoy Checkout Pro no la usa, pero conviene tenerla cargada.");
} else if (publicKey.length > token.length) {
  ojo("La Public Key es más larga que el Access Token: revisá que no estén cruzadas.");
} else {
  ok(`Public Key — ${huella(publicKey)}`);
}

if (!secret) {
  mal("MP_WEBHOOK_SECRET está vacío: el webhook rechaza TODO con 401.");
  nota("La persona paga y nunca recibe el material. Falta pedírselo a Tati.");
} else {
  ok(`Clave del webhook cargada — ${secret.length} caracteres`);
}

// --- 2 y 3. modo real y titular -------------------------------------------
titulo("A qué cuenta entra la plata");

const esUsuarioDePrueba =
  String(cuenta.nickname ?? "").startsWith("TESTUSER") ||
  String(cuenta.email ?? "").includes("@testuser.com");

const modo = token.startsWith("TEST-") || esUsuarioDePrueba ? "prueba" : "producción";

ok(`Titular: \x1b[1m${`${cuenta.first_name ?? ""} ${cuenta.last_name ?? ""}`.trim() || "—"}\x1b[0m`);
ok(`Mail: ${cuenta.email ?? "—"}`);
ok(`Usuario: ${cuenta.nickname ?? "—"} · id ${cuenta.id}`);
ok(`País: ${cuenta.site_id ?? "—"}${cuenta.site_id === "MLA" ? " (Argentina)" : ""}`);

console.log();
if (modo === "prueba") {
  ojo("Son credenciales de \x1b[1mPRUEBA\x1b[0m: no mueven plata real.");
  if (esUsuarioDePrueba && !token.startsWith("TEST-")) {
    nota("Empiezan con APP_USR-, pero la cuenta detrás es un usuario de test.");
    nota("Es cómo las entrega hoy el panel de Mercado Pago: el prefijo engaña.");
  }
} else {
  ojo("Son credenciales de \x1b[1mPRODUCCIÓN\x1b[0m: cada cobro es dinero real.");
  nota("Confirmá que el nombre y el mail de arriba son los de Tatiana.");
  nota("Si no lo son, la plata de cada venta cae en esa otra cuenta.");
}

// --- 4. ¿puede cobrar? -----------------------------------------------------
titulo("¿Puede generar cobros?");

const sitio = env.NEXT_PUBLIC_SITE_URL || "https://cisur.vercel.app";

try {
  const r = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
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
  nota("Nadie la va a pagar: vence sola y no cobra nada.");
} catch (e) {
  salir(`Falló la llamada a Mercado Pago: ${e.message}`);
}

// --- resumen ---------------------------------------------------------------
const nombre = `${cuenta.first_name ?? ""} ${cuenta.last_name ?? ""}`.trim() || cuenta.nickname;
console.log(
  `\n\x1b[1mListo.\x1b[0m Credenciales de \x1b[1m${modo}\x1b[0m, válidas, sobre la cuenta de ${nombre}.`,
);
console.log(
  "\x1b[2mPara que apliquen en el sitio hay que cargar estas mismas tres en Vercel y redeployar.\x1b[0m\n",
);
