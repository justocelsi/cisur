#!/usr/bin/env node
/**
 * Concilia cada compra de la base contra lo que dice Mercado Pago.
 *
 *   npm run conciliar                 informe
 *   npm run conciliar -- --arreglar   además destraba lo que se pueda destrabar
 *
 * POR QUÉ EXISTE
 * El webhook puede perderse: Mercado Pago reintenta, pero si el deploy estaba
 * caído, si la firma estaba mal configurada o si MP directamente no notificó,
 * queda una compra 'pendiente' con el dinero ya cobrado. Nadie se entera hasta
 * que la persona reclama —y mucha gente no reclama, simplemente no vuelve.
 *
 * Mirar la tabla de compras no alcanza para detectarlo: una compra abandonada
 * y una compra pagada-sin-confirmar se ven exactamente igual. La única forma
 * de distinguirlas es preguntarle a Mercado Pago por cada external_reference.
 *
 * LOS CUATRO DESACUERDOS QUE BUSCA
 *   COBRADA SIN ENTREGAR  pendiente/cancelada acá, aprobada en MP.  ← grave
 *   ACCESO SIN PAGO       pagada acá, sin pago aprobado en MP.      ← grave
 *   DEVUELTA              pagada acá, reembolsada o contracargada en MP.
 *   abandonada            pendiente acá y sin pago: es lo normal.
 *
 * No escribe nada salvo que se pase --arreglar, y aun así nunca inventa un
 * estado: confirma vía /api/admin/reconfirm, que vuelve a consultarle a MP.
 */

import { readFileSync } from "node:fs";

const MP = "https://api.mercadopago.com";
const ARREGLAR = process.argv.includes("--arreglar");

const c = {
  gris: (s) => `\x1b[2m${s}\x1b[0m`,
  rojo: (s) => `\x1b[31m${s}\x1b[0m`,
  verde: (s) => `\x1b[32m${s}\x1b[0m`,
  ambar: (s) => `\x1b[33m${s}\x1b[0m`,
  fuerte: (s) => `\x1b[1m${s}\x1b[0m`,
  fondoRojo: (s) => `\x1b[41m\x1b[97m${s}\x1b[0m`,
};

function leerEnv(ruta = ".env.local") {
  let texto;
  try {
    texto = readFileSync(ruta, "utf8");
  } catch {
    console.error(`No encontré ${ruta}.`);
    process.exit(1);
  }
  const env = {};
  for (const linea of texto.split("\n")) {
    const m = linea.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = leerEnv();
const SUPABASE = env.NEXT_PUBLIC_SUPABASE_URL;
const SECRETA = env.SUPABASE_SECRET_KEY;
const TOKEN_MP = env.MP_ACCESS_TOKEN;
const SITIO = (env.NEXT_PUBLIC_SITE_URL || "https://cisur.vercel.app").replace(/\/+$/, "");

for (const [nombre, v] of [
  ["NEXT_PUBLIC_SUPABASE_URL", SUPABASE],
  ["SUPABASE_SECRET_KEY", SECRETA],
  ["MP_ACCESS_TOKEN", TOKEN_MP],
]) {
  if (!v) {
    console.error(`Falta ${nombre} en .env.local`);
    process.exit(1);
  }
}

const cabecerasSupabase = {
  apikey: SECRETA,
  Authorization: `Bearer ${SECRETA}`,
};

async function traerJson(url, opciones) {
  const r = await fetch(url, opciones);
  const cuerpo = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(cuerpo).slice(0, 160)}`);
  return cuerpo;
}

// --- datos ------------------------------------------------------------------
const compras = await traerJson(
  `${SUPABASE}/rest/v1/compras?select=id,order_id,estado,precio_pagado,referencia_pago,created_at,pagado_en,user_id,producto_id&order=created_at.desc`,
  { headers: cabecerasSupabase },
);

const usuarios = new Map();
try {
  const { users } = await traerJson(`${SUPABASE}/auth/v1/admin/users?per_page=200`, {
    headers: cabecerasSupabase,
  });
  for (const u of users ?? []) usuarios.set(u.id, u.email);
} catch {
  // Sin mails el informe sigue sirviendo; sólo se lee peor.
}

console.log(`\n${c.fuerte("Conciliación de pagos")}  ${c.gris(`· ${compras.length} compras`)}\n`);

// Estados de MP que significan "la plata se movió de verdad".
const APROBADOS = new Set(["approved", "authorized"]);
const DEVUELTOS = new Set(["refunded", "charged_back", "cancelled"]);

const hallazgos = [];

for (const compra of compras) {
  let pagos = [];
  try {
    const r = await traerJson(
      `${MP}/v1/payments/search?external_reference=${encodeURIComponent(compra.order_id)}`,
      { headers: { Authorization: `Bearer ${TOKEN_MP}` } },
    );
    pagos = r?.results ?? [];
  } catch (e) {
    console.log(`  ${c.ambar("?")} ${compra.order_id.slice(0, 8)}  no pude consultar MP: ${e.message}`);
    continue;
  }

  const aprobado = pagos.find((p) => APROBADOS.has(p.status));
  const devuelto = pagos.find((p) => DEVUELTOS.has(p.status));
  const mail = usuarios.get(compra.user_id) ?? "?";
  const etiqueta = `${String(compra.created_at).slice(5, 16)}  $${String(compra.precio_pagado).padStart(9)}  ${mail}`;

  let veredicto;
  let gravedad = "ok";

  if (compra.estado === "pagada" && aprobado && !devuelto) {
    veredicto = "coincide";
  } else if (compra.estado === "pagada" && devuelto) {
    veredicto = `DEVUELTA en MP (${devuelto.status}) pero sigue con acceso acá`;
    gravedad = "grave";
  } else if (compra.estado === "pagada" && !aprobado) {
    veredicto = "ACCESO SIN PAGO: figura pagada y MP no tiene ningún pago aprobado";
    gravedad = "grave";
  } else if (compra.estado !== "pagada" && aprobado) {
    veredicto = `COBRADA SIN ENTREGAR: MP aprobó el pago ${aprobado.id} y acá figura ${compra.estado}`;
    gravedad = "grave";
  } else if (compra.estado === "pendiente") {
    veredicto = pagos.length
      ? `abandonada (MP tiene ${pagos.length} intento/s, ninguno aprobado)`
      : "abandonada, sin ningún intento de pago en MP";
  } else {
    veredicto = compra.estado;
  }

  const marca =
    gravedad === "grave" ? c.rojo("✗") : veredicto === "coincide" ? c.verde("✓") : c.gris("·");
  const texto = gravedad === "grave" ? c.rojo(veredicto) : c.gris(veredicto);
  console.log(`  ${marca} ${etiqueta}  ${texto}`);

  if (gravedad === "grave") hallazgos.push({ compra, aprobado, devuelto, veredicto });
}

// --- resumen ----------------------------------------------------------------
const cobradasSinEntregar = hallazgos.filter((h) => h.compra.estado !== "pagada" && h.aprobado);

console.log();
if (hallazgos.length === 0) {
  console.log(`  ${c.verde("Todo coincide con Mercado Pago.")} Ninguna compra quedó descolgada.`);
  console.log(
    c.gris("  Las pendientes sin intento de pago son gente que abrió el checkout y no pagó."),
  );
} else {
  console.log(c.fondoRojo(`  ${hallazgos.length} DESACUERDO(S) CON MERCADO PAGO  `));
  for (const h of hallazgos) {
    console.log(`   · ${h.compra.order_id}  ${h.veredicto}`);
  }
}

// --- arreglo opcional -------------------------------------------------------
if (!ARREGLAR) {
  if (cobradasSinEntregar.length) {
    console.log(
      `\n  ${c.ambar("Corré con --arreglar para destrabarlas vía /api/admin/reconfirm.")}`,
    );
  }
  console.log();
  process.exit(hallazgos.length ? 1 : 0);
}

if (!env.ADMIN_SECRET) {
  console.error("\nFalta ADMIN_SECRET para poder arreglar.\n");
  process.exit(1);
}

// Se procesan también las DEVUELTA: con la migración 0007, confirmar_pago sabe
// bajar de 'pagada' a 'reembolsada', así que reconfirm ahora sí puede cortarle
// el acceso a alguien a quien se le devolvió la plata.
const paraArreglar = hallazgos.filter((h) => h.aprobado || h.devuelto);
let fallas = 0;

for (const h of paraArreglar) {
  process.stdout.write(`  ${h.compra.order_id.slice(0, 8)}… `);
  try {
    const r = await traerJson(`${SITIO}/api/admin/reconfirm`, {
      method: "POST",
      headers: { "x-admin-secret": env.ADMIN_SECRET, "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: h.compra.order_id }),
    });
    // 0 filas NO es éxito. reconfirm devuelve 200 igual, y decir "ok" en verde
    // acá mandaba a dormir tranquilo a quien corrió el script justo en el caso
    // que había que revisar a mano.
    if (Number(r.actualizadas) > 0) {
      console.log(c.verde(`ok (${r.actualizadas} fila/s)`));
    } else {
      fallas += 1;
      console.log(c.rojo(`NO se pudo: la compra sigue en '${h.compra.estado}'`));
      console.log(
        c.gris("      Revisala a mano. Si la migración 0007 no está aplicada, aplicala."),
      );
    }
  } catch (e) {
    fallas += 1;
    console.log(c.rojo(e.message));
  }
}

console.log();
if (fallas) {
  console.log(c.rojo(`  ${fallas} compra(s) siguen descolgadas.\n`));
}
process.exit(fallas ? 1 : 0);
