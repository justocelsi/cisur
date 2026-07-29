import { describe, it, expect } from "vitest";
import {
  formatearPrecio,
  formatearFecha,
  safeHref,
  safeNextPath,
  slugify,
  linkWhatsApp,
} from "./utils.js";

describe("formatearPrecio", () => {
  it("formatea enteros sin decimales", () => {
    expect(formatearPrecio(19900).replace(/ /g, " ")).toBe("$ 19.900");
  });

  it("conserva decimales cuando los hay", () => {
    expect(formatearPrecio(19900.5).replace(/ /g, " ")).toBe("$ 19.900,50");
  });

  it("acepta strings numéricos, como vienen de numeric de Postgres", () => {
    expect(formatearPrecio("19900.00").replace(/ /g, " ")).toBe("$ 19.900");
  });

  it("devuelve vacío ante basura", () => {
    expect(formatearPrecio(null)).toBe("");
    expect(formatearPrecio(undefined)).toBe("");
    expect(formatearPrecio("hola")).toBe("");
  });
});

describe("formatearFecha", () => {
  it("formatea una fecha ISO en castellano", () => {
    expect(formatearFecha("2026-07-29T15:00:00Z")).toBe("29 de julio de 2026");
  });

  it("devuelve vacío ante entradas inválidas", () => {
    expect(formatearFecha(null)).toBe("");
    expect(formatearFecha("no-es-fecha")).toBe("");
  });
});

describe("safeHref", () => {
  it("permite http y https", () => {
    expect(safeHref("https://wa.me/542234474674")).toBe(
      "https://wa.me/542234474674",
    );
    expect(safeHref("http://ejemplo.com/")).toBe("http://ejemplo.com/");
  });

  it("permite mailto y tel", () => {
    expect(safeHref("mailto:hola@cisur.com")).toBe("mailto:hola@cisur.com");
    expect(safeHref("tel:+542234474674")).toBe("tel:+542234474674");
  });

  it("permite rutas internas y anclas", () => {
    expect(safeHref("/talleres")).toBe("/talleres");
    expect(safeHref("#comprar")).toBe("#comprar");
  });

  it("bloquea javascript:", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("  JavaScript:alert(1)")).toBeNull();
    expect(safeHref("JAVASCRIPT:alert(1)")).toBeNull();
  });

  it("bloquea data: y otros esquemas raros", () => {
    expect(safeHref("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeHref("vbscript:msgbox(1)")).toBeNull();
    expect(safeHref("file:///etc/passwd")).toBeNull();
  });

  it("bloquea protocol-relative (//evil.com)", () => {
    expect(safeHref("//evil.com")).toBeNull();
  });

  it("devuelve null ante entradas no string o vacías", () => {
    expect(safeHref(null)).toBeNull();
    expect(safeHref("")).toBeNull();
    expect(safeHref("   ")).toBeNull();
    expect(safeHref(42)).toBeNull();
  });
});

describe("safeNextPath", () => {
  it("acepta rutas internas", () => {
    expect(safeNextPath("/mis-materiales")).toBe("/mis-materiales");
    expect(safeNextPath("/leer/abc?p=3")).toBe("/leer/abc?p=3");
  });

  it("rechaza URLs absolutas (open redirect)", () => {
    expect(safeNextPath("https://sitio-falso.com")).toBe("/mis-materiales");
    expect(safeNextPath("http://sitio-falso.com")).toBe("/mis-materiales");
  });

  it("rechaza protocol-relative", () => {
    expect(safeNextPath("//sitio-falso.com")).toBe("/mis-materiales");
  });

  it("rechaza backslashes, que algunos navegadores normalizan a /", () => {
    expect(safeNextPath("/\\sitio-falso.com")).toBe("/mis-materiales");
    expect(safeNextPath("\\\\sitio-falso.com")).toBe("/mis-materiales");
  });

  it("rechaza un esquema colado antes de la primera barra", () => {
    expect(safeNextPath("/javascript:alert(1)")).toBe("/mis-materiales");
  });

  it("respeta el default que le pasen", () => {
    expect(safeNextPath("https://evil.com", "/")).toBe("/");
    expect(safeNextPath(null, "/panel")).toBe("/panel");
  });
});

describe("slugify", () => {
  it("saca tildes y normaliza espacios", () => {
    expect(slugify("El rol de la familia en la alfabetización")).toBe(
      "el-rol-de-la-familia-en-la-alfabetizacion",
    );
  });

  it("saca signos y guiones sobrantes", () => {
    expect(slugify("  ¿Qué significa alfabetizar?  ")).toBe(
      "que-significa-alfabetizar",
    );
  });

  it("corta a 80 caracteres", () => {
    expect(slugify("a".repeat(200))).toHaveLength(80);
  });

  it("devuelve vacío ante basura", () => {
    expect(slugify(null)).toBe("");
    expect(slugify("¿¡!?")).toBe("");
  });
});

describe("linkWhatsApp", () => {
  it("arma el link a partir del número", () => {
    expect(linkWhatsApp("542234474674")).toBe("https://wa.me/542234474674");
  });

  it("limpia todo lo que no sea dígito", () => {
    expect(linkWhatsApp("+54 (223) 447-4674")).toBe(
      "https://wa.me/542234474674",
    );
  });

  it("agrega el mensaje encodeado", () => {
    expect(linkWhatsApp("542234474674", "Hola Tati!")).toBe(
      "https://wa.me/542234474674?text=Hola%20Tati!",
    );
  });

  it("devuelve null si no hay número", () => {
    expect(linkWhatsApp("")).toBeNull();
    expect(linkWhatsApp(null)).toBeNull();
    expect(linkWhatsApp("sin-digitos")).toBeNull();
  });
});
