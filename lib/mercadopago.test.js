import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { validarFirmaWebhook } from "./mercadopago.js";

const SECRET = "clave-secreta-de-prueba";

function firmar({ dataId, requestId, ts, secret = SECRET }) {
  const manifest = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${ts};`;
  const v1 = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

describe("validarFirmaWebhook", () => {
  const base = {
    dataId: "123456789",
    xRequestId: "req-abc-123",
    ts: "1732000000",
  };

  it("acepta una firma correcta", () => {
    const xSignature = firmar({
      dataId: base.dataId,
      requestId: base.xRequestId,
      ts: base.ts,
    });
    expect(
      validarFirmaWebhook({
        xSignature,
        xRequestId: base.xRequestId,
        dataId: base.dataId,
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it("normaliza el dataId a minúsculas, como pide MP", () => {
    const xSignature = firmar({
      dataId: "ABCDEF",
      requestId: base.xRequestId,
      ts: base.ts,
    });
    expect(
      validarFirmaWebhook({
        xSignature,
        xRequestId: base.xRequestId,
        dataId: "ABCDEF",
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it("rechaza una firma calculada con otra clave", () => {
    const xSignature = firmar({
      dataId: base.dataId,
      requestId: base.xRequestId,
      ts: base.ts,
      secret: "clave-del-atacante",
    });
    expect(
      validarFirmaWebhook({
        xSignature,
        xRequestId: base.xRequestId,
        dataId: base.dataId,
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("rechaza si cambiaron el dataId (replay a otro pago)", () => {
    const xSignature = firmar({
      dataId: base.dataId,
      requestId: base.xRequestId,
      ts: base.ts,
    });
    expect(
      validarFirmaWebhook({
        xSignature,
        xRequestId: base.xRequestId,
        dataId: "999999999",
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("rechaza si cambiaron el request-id", () => {
    const xSignature = firmar({
      dataId: base.dataId,
      requestId: base.xRequestId,
      ts: base.ts,
    });
    expect(
      validarFirmaWebhook({
        xSignature,
        xRequestId: "otro-request-id",
        dataId: base.dataId,
        secret: SECRET,
      }),
    ).toBe(false);
  });

  // Fail-closed: éstos son los casos donde un fail-open dejaría el webhook
  // abierto a cualquiera.
  it("rechaza cuando falta el header de firma", () => {
    expect(
      validarFirmaWebhook({
        xSignature: null,
        xRequestId: base.xRequestId,
        dataId: base.dataId,
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("rechaza cuando no hay secret configurado", () => {
    const xSignature = firmar({
      dataId: base.dataId,
      requestId: base.xRequestId,
      ts: base.ts,
    });
    expect(
      validarFirmaWebhook({
        xSignature,
        xRequestId: base.xRequestId,
        dataId: base.dataId,
        secret: undefined,
      }),
    ).toBe(false);
  });

  it("rechaza un header malformado", () => {
    for (const xSignature of [
      "",
      "basura",
      "ts=1732000000",
      "v1=abc",
      "ts=,v1=",
      "ts=1732000000,v1=demasiado-corto",
    ]) {
      expect(
        validarFirmaWebhook({
          xSignature,
          xRequestId: base.xRequestId,
          dataId: base.dataId,
          secret: SECRET,
        }),
      ).toBe(false);
    }
  });

  it("rechaza cuando falta el dataId", () => {
    const xSignature = firmar({
      dataId: base.dataId,
      requestId: base.xRequestId,
      ts: base.ts,
    });
    expect(
      validarFirmaWebhook({
        xSignature,
        xRequestId: base.xRequestId,
        dataId: null,
        secret: SECRET,
      }),
    ).toBe(false);
  });
});
