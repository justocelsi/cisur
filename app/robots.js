import { urlSitio } from "@/lib/utils";

export default function robots() {
  const base = urlSitio();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Nada de esto tiene sentido en un buscador, y el lector no debe
        // aparecer indexado bajo ninguna circunstancia.
        disallow: [
          "/api/",
          "/leer/",
          "/panel",
          "/mis-materiales",
          "/ingresar",
          "/nueva-clave",
          "/pago/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
