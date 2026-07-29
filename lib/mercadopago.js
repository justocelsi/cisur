import crypto from "node:crypto";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

/**
 * Mercado Pago Checkout Pro, server-only.
 *
 * Nunca tocamos datos de tarjeta: el usuario paga en el dominio de MP y
 * nosotros sólo creamos la preferencia y escuchamos el webhook.
 */

function config() {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("Falta MP_ACCESS_TOKEN en el entorno");
  }
  return new MercadoPagoConfig({
    accessToken,
    options: { timeout: 10000 },
  });
}

/**
 * Crea la preferencia de pago y devuelve la URL de checkout.
 *
 * `orderId` viaja como external_reference y es lo que nos permite, cuando
 * vuelve el webhook, saber qué compra confirmar sin confiar en nada más.
 */
export async function crearPreferencia({
  orderId,
  titulo,
  precio,
  cantidad = 1,
  emailComprador,
  siteUrl,
}) {
  const preference = new Preference(config());

  const body = {
    items: [
      {
        id: orderId,
        title: titulo.slice(0, 256),
        quantity: cantidad,
        unit_price: Number(precio),
        currency_id: "ARS",
        category_id: "learnings",
      },
    ],
    external_reference: orderId,
    statement_descriptor: "CISUR",
    back_urls: {
      success: `${siteUrl}/pago/exito?order=${orderId}`,
      pending: `${siteUrl}/pago/pendiente?order=${orderId}`,
      failure: `${siteUrl}/pago/error?order=${orderId}`,
    },
    auto_return: "approved",
    notification_url: `${siteUrl}/api/webhook/mp`,
    ...(emailComprador ? { payer: { email: emailComprador } } : {}),
  };

  const resultado = await preference.create({ body });

  return {
    preferenceId: resultado.id,
    initPoint: resultado.init_point,
    sandboxInitPoint: resultado.sandbox_init_point,
  };
}

/**
 * Consulta un pago a la API de MP.
 *
 * Regla de oro: el body del webhook NO se cree. Sólo trae un id; el estado
 * real y el external_reference se leen de acá. Sin esto, cualquiera que
 * conozca la URL del webhook podría postear {status:"approved"}.
 */
export async function obtenerPago(paymentId) {
  const payment = new Payment(config());
  const p = await payment.get({ id: paymentId });

  return {
    id: String(p.id),
    status: p.status,
    statusDetail: p.status_detail,
    externalReference: p.external_reference,
    montoAprobado: p.transaction_amount,
    metodo: p.payment_type_id,
    emailPagador: p.payer?.email ?? null,
  };
}

/**
 * Busca los pagos de una orden por external_reference.
 *
 * Es la red de rescate para cuando el webhook se perdió (MP lo reintenta, pero
 * si el deploy estaba caído justo en ese momento la compra queda pendiente con
 * el dinero ya cobrado). La usa /api/admin/reconfirm.
 */
export async function buscarPagosPorReferencia(orderId) {
  const payment = new Payment(config());
  const resultado = await payment.search({
    options: { external_reference: orderId, sort: "date_created", criteria: "desc" },
  });

  const encontrados = resultado?.results ?? [];
  return encontrados.map((p) => ({
    id: String(p.id),
    status: p.status,
    statusDetail: p.status_detail,
    externalReference: p.external_reference,
    montoAprobado: p.transaction_amount,
  }));
}

/**
 * Valida la firma HMAC del webhook (obligatoria en Webhooks v2).
 *
 * El manifest es exactamente:
 *   id:<dataId>;request-id:<x-request-id>;ts:<ts>;
 * con dataId en minúsculas, y se firma con HMAC-SHA256 usando la clave
 * secreta del webhook.
 *
 * Falla CERRADO: sin header o con firma inválida devolvemos false. Un
 * fail-open acá convierte el webhook en un endpoint público para regalarse
 * productos.
 */
export function validarFirmaWebhook({
  xSignature,
  xRequestId,
  dataId,
  secret,
}) {
  if (!secret) return false;
  if (!xSignature || !dataId) return false;

  const partes = String(xSignature)
    .split(",")
    .reduce((acc, parte) => {
      const [clave, valor] = parte.split("=").map((s) => s?.trim());
      if (clave && valor) acc[clave] = valor;
      return acc;
    }, {});

  const ts = partes.ts;
  const hashRecibido = partes.v1;
  if (!ts || !hashRecibido) return false;

  const manifest = `id:${String(dataId).toLowerCase()};request-id:${
    xRequestId ?? ""
  };ts:${ts};`;

  const hashEsperado = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  // Comparación en tiempo constante: evita filtrar el hash byte a byte.
  const a = Buffer.from(hashEsperado, "utf8");
  const b = Buffer.from(hashRecibido, "utf8");
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}
