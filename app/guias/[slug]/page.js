import { notFound } from "next/navigation";
import PortadaGuia from "@/app/components/PortadaGuia";
import BotonComprar from "@/app/components/BotonComprar";
import Preguntas from "@/app/components/Preguntas";
import { getProducto, getProductos, getTextos, t } from "@/lib/datos";
import { formatearPrecio, urlPublica, urlSitio } from "@/lib/utils";

export const revalidate = 300;

/** Prerenderiza los slugs del catálogo: las páginas de producto salen estáticas. */
export async function generateStaticParams() {
  const productos = await getProductos();
  return productos.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const producto = await getProducto(slug);

  if (!producto) {
    return { title: "Material no encontrado", robots: { index: false } };
  }

  const imagen = urlPublica(producto.portada_path);

  return {
    title: producto.titulo,
    description:
      producto.descripcion ??
      `${producto.titulo} — material de alfabetización para familias.`,
    alternates: { canonical: `/guias/${producto.slug}` },
    openGraph: {
      type: "article",
      title: producto.titulo,
      description: producto.descripcion ?? undefined,
      url: `${urlSitio()}/guias/${producto.slug}`,
      images: imagen ? [{ url: imagen }] : undefined,
    },
  };
}

export default async function DetalleGuia({ params }) {
  const { slug } = await params;
  const [producto, textos] = await Promise.all([getProducto(slug), getTextos()]);

  if (!producto) notFound();

  const indice = Array.isArray(producto.indice) ? producto.indice : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: producto.titulo,
    description: producto.descripcion ?? undefined,
    image: urlPublica(producto.portada_path) ?? undefined,
    author: {
      "@type": "Person",
      name: producto.autor ?? "Tatiana Galera",
      jobTitle: "Licenciada en Psicopedagogía",
    },
    offers: {
      "@type": "Offer",
      price: Number(producto.precio),
      priceCurrency: "ARS",
      availability: "https://schema.org/InStock",
      url: `${urlSitio()}/guias/${producto.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="contenedor py-16 md:py-24">
        <div className="grid gap-14 md:grid-cols-[0.85fr_1.15fr] md:gap-20">
          <div className="mx-auto w-full max-w-[300px] md:sticky md:top-28 md:self-start">
            <PortadaGuia producto={producto} prioridad />
          </div>

          <div>
            {producto.subtitulo ? (
              <p className="versalitas text-verde-claro">{producto.subtitulo}</p>
            ) : null}

            <h1 className="mt-4 text-[2.2rem] leading-[1.1] text-tinta sm:text-[2.7rem]">
              {producto.titulo}
            </h1>

            <p className="mt-4 text-tinta-tenue">
              {producto.autor ?? "Lic. Tatiana Galera"}
              {producto.paginas ? ` · ${producto.paginas} páginas` : ""}
            </p>

            {producto.descripcion ? (
              <p className="mt-7 text-[1.18rem] leading-relaxed text-tinta-suave">
                {producto.descripcion}
              </p>
            ) : null}

            {/* Bloque de compra */}
            <div
              id="comprar"
              className="mt-10 scroll-mt-28 rounded-[3px] border border-tostado-claro bg-tostado-tenue p-7 sm:p-8"
            >
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-[2.2rem] leading-none text-verde">
                  {formatearPrecio(producto.precio)}
                </span>
                {producto.precio_lista &&
                Number(producto.precio_lista) > Number(producto.precio) ? (
                  <span className="text-[1.2rem] text-tinta-tenue line-through">
                    {formatearPrecio(producto.precio_lista)}
                  </span>
                ) : null}
                <span className="text-[0.95rem] text-tinta-tenue">pago único</span>
              </div>

              <ul className="lista mt-5 text-[1.05rem] text-tinta-suave">
                <li>{t(textos, "compra_detalle_1", "Acceso inmediato después del pago")}</li>
                <li>{t(textos, "compra_detalle_2", "Lectura online desde celular, tablet o computadora")}</li>
                <li>{t(textos, "compra_detalle_3", "Sin vencimiento: la leés cuando quieras")}</li>
                <li>{t(textos, "compra_detalle_4", "Escrita por una psicopedagoga matriculada")}</li>
              </ul>

              <BotonComprar producto={producto} className="mt-7" />
            </div>

            {indice.length > 0 ? (
              <section className="mt-14">
                <h2 className="versalitas text-verde-claro">Índice</h2>
                <ol className="mt-6 space-y-4">
                  {indice.map((capitulo, i) => (
                    <li
                      key={i}
                      className="flex gap-4 border-b border-papel-3 pb-4"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-0.5 shrink-0 text-[0.95rem] text-salvia"
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="leading-snug text-tinta-suave">
                        {capitulo}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </div>
        </div>

        <section className="mt-24 border-t border-papel-3 pt-16">
          <h2 className="text-center text-[1.7rem] leading-tight text-tinta sm:text-[2rem]">
            Preguntas frecuentes
          </h2>
          <Preguntas textos={textos} className="mx-auto mt-10 max-w-2xl" />
        </section>
      </article>
    </>
  );
}
