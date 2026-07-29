import { getProductos } from "@/lib/datos";
import { urlSitio } from "@/lib/utils";

export const revalidate = 3600;

export default async function sitemap() {
  const base = urlSitio();
  const productos = await getProductos();
  const ahora = new Date();

  const fijas = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/guias`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/talleres`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/sobre-mi`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/legales/terminos`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/legales/privacidad`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/legales/reembolsos`, changeFrequency: "yearly", priority: 0.2 },
    {
      url: `${base}/legales/arrepentimiento`,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  const deProductos = productos.map((p) => ({
    url: `${base}/guias/${p.slug}`,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  return [...fijas, ...deProductos].map((entrada) => ({
    ...entrada,
    lastModified: ahora,
  }));
}
