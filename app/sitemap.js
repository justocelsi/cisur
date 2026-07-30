import { urlSitio } from "@/lib/utils";

export const revalidate = 3600;

/**
 * El sitio es una sola página: el sitemap lista la portada y los legales.
 * Los materiales son secciones (#slug) y no llevan entrada propia — un ancla
 * no es una URL distinta para Google.
 */
export default function sitemap() {
  const base = urlSitio();
  const ahora = new Date();

  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/legales/terminos`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/legales/privacidad`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/legales/reembolsos`, changeFrequency: "yearly", priority: 0.2 },
    {
      url: `${base}/legales/arrepentimiento`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ].map((entrada) => ({ ...entrada, lastModified: ahora }));
}
