import TextoEditable from "./components/TextoEditable";
import PortadaGuia from "./components/PortadaGuia";
import SeccionProducto from "./components/SeccionProducto";
import SeccionSobreMi from "./components/SeccionSobreMi";
import BloqueTalleres from "./components/BloqueTalleres";
import BloqueContacto from "./components/BloqueContacto";
import Preguntas from "./components/Preguntas";
import { getProductos, getTalleres, getTextos } from "@/lib/datos";
import { formatearPrecio, urlPublicaAbsoluta, urlSitio } from "@/lib/utils";

// Estático, revalidado cada 5 minutos: la página carga al instante y no consume
// egress de Supabase en cada visita. Cuando Tati edita un texto lo ve al toque
// en su navegador (guardado optimista) y para el resto entra en el próximo
// revalidado.
export const revalidate = 300;

export default async function Inicio() {
  const [productos, textos, talleres] = await Promise.all([
    getProductos(),
    getTextos(),
    getTalleres(),
  ]);

  // El producto destacado protagoniza el hero; el resto sigue teniendo su
  // propia sección más abajo.
  const destacado = productos.find((p) => p.destacado) ?? productos[0] ?? null;

  // Se listan las claves, no los valores ya resueltos: cada ítem se renderiza
  // con TextoEditable, que lee el valor y además lo hace editable en el sitio.
  const dolores = [
    "¿Lo estaré ayudando bien?",
    "¿Debería practicar más en casa?",
    "¿Es normal que escriba así?",
    "¿Tengo que corregirle los errores?",
  ];

  const comoFunciona = [
    "Acceso inmediato después del pago",
    "Lectura online desde celular, tablet o computadora",
    "Sin vencimiento: lo leés cuando quieras",
    "Escrito por una psicopedagoga matriculada",
  ];

  // Un ItemList con los productos: le da a Google el catálogo completo de una
  // página sola, que es justamente el punto de un one-pager.
  const jsonLd =
    productos.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: productos.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Product",
              name: p.titulo,
              description: p.descripcion ?? undefined,
              image: urlPublicaAbsoluta(p.portada_path) ?? undefined,
              brand: { "@type": "Brand", name: "CISUR — Centro Integral Sur" },
              author: {
                "@type": "Person",
                name: p.autor ?? "Tatiana Galera",
                jobTitle: "Licenciada en Psicopedagogía",
              },
              offers: {
                "@type": "Offer",
                price: Number(p.precio),
                priceCurrency: "ARS",
                availability: "https://schema.org/InStock",
                url: `${urlSitio()}/#${p.slug}`,
              },
            },
          })),
        }
      : null;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          // Contenido propio, no de usuarios anónimos.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}

      {/* ================================================================
          HERO
          ================================================================ */}
      <section className="border-b border-papel-3 bg-gradient-to-b from-papel-2 to-papel">
        <div className="contenedor grid items-center gap-14 py-16 md:grid-cols-[1.15fr_0.85fr] md:py-24">
          <div>
            <TextoEditable
              clave="hero_kicker"
              como="p"
              className="versalitas text-verde-claro"
            >
              Guía para familias
            </TextoEditable>

            <TextoEditable
              clave="hero_titulo"
              como="h1"
              className="mt-5 text-[2.5rem] leading-[1.08] text-tinta sm:text-[3.2rem] md:text-[3.6rem]"
            >
              El rol de la familia en el proceso de alfabetización
            </TextoEditable>

            <TextoEditable
              clave="hero_texto"
              como="p"
              multilinea
              className="mt-6 max-w-xl text-[1.32rem] leading-relaxed text-tinta-suave"
            >
              Una guía práctica para entender cómo aprenden a leer y escribir tus
              hijos, y cómo acompañarlos desde casa con confianza, sin presiones y
              sin convertirte en su maestra.
            </TextoEditable>

            {destacado ? (
              <div className="mt-9 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                <TextoEditable
                  clave="hero_cta"
                  como="a"
                  href={`#${destacado.slug}`}
                  className="inline-flex w-full items-center justify-center rounded-[2px] bg-verde px-8 py-4 text-[1.21rem] text-papel transition-colors hover:bg-verde-oscuro sm:w-auto"
                >
                  Quiero la guía
                </TextoEditable>
                <p className="text-[1.05rem] text-tinta-tenue">
                  <span className="text-tinta">
                    {formatearPrecio(destacado.precio)}
                  </span>{" "}
                  · pago único · acceso inmediato
                </p>
              </div>
            ) : null}

            <hr className="filete mt-10 max-w-xs" />
            <TextoEditable
              clave="hero_firma"
              como="p"
              className="mt-4 text-[1.05rem] text-tinta-tenue"
            >
              Lic. Tatiana Galera · Psicopedagoga · Mat. Prov. 205281
            </TextoEditable>
          </div>

          <div className="mx-auto w-full max-w-[300px] md:max-w-[340px]">
            <PortadaGuia producto={destacado} prioridad />
          </div>
        </div>
      </section>

      {/* ================================================================
          EL PROBLEMA — por qué existe todo lo de abajo
          ================================================================ */}
      <section className="contenedor py-20 md:py-28">
        <TextoEditable
          clave="dolor_titulo"
          como="h2"
          className="mx-auto max-w-2xl text-center text-[2rem] leading-tight text-tinta sm:text-[2.4rem]"
        >
          ¿Alguna de estas preguntas te resulta familiar?
        </TextoEditable>

        <ul className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
          {dolores.map((pregunta, i) => (
            <li
              key={i}
              className="rounded-[3px] border border-papel-3 bg-papel-2 px-6 py-5 text-[1.21rem] italic text-tinta-suave"
            >
              «
              <TextoEditable clave={`dolor_${i + 1}`}>{pregunta}</TextoEditable>»
            </li>
          ))}
        </ul>

        <TextoEditable
          clave="dolor_cierre"
          como="p"
          multilinea
          className="mx-auto mt-12 max-w-xl text-center text-[1.27rem] leading-relaxed text-tinta-suave"
        >
          Detrás de estas preguntas hay mucho amor y muchas ganas de acompañar.
          También, muchas veces, la sensación de no saber por dónde empezar. Esta
          guía es para eso.
        </TextoEditable>
      </section>

      {/* ================================================================
          LA CITA
          ================================================================ */}
      <section className="border-y border-papel-3 bg-verde py-20 text-papel md:py-24">
        <div className="contenedor-angosto text-center">
          <p aria-hidden="true" className="text-2xl text-salvia/60">
            ❧
          </p>
          <TextoEditable
            clave="cita_texto"
            como="blockquote"
            multilinea
            className="mt-6 text-[1.6rem] leading-[1.45] text-papel sm:text-[1.95rem]"
          >
            «La alfabetización no comienza cuando el niño o la niña ingresan a la
            escuela primaria. Comienza mucho antes, en cada conversación, en cada
            cuento compartido y en cada oportunidad de descubrir que las palabras
            tienen un significado.»
          </TextoEditable>
          <TextoEditable
            clave="cita_autor"
            como="p"
            className="mt-7 versalitas text-salvia"
          >
            Capítulo 1 de la guía
          </TextoEditable>
        </div>
      </section>

      {/* ================================================================
          LOS MATERIALES — una sección por producto
          ================================================================ */}
      {productos.map((producto, i) => (
        <SeccionProducto
          key={producto.id}
          producto={producto}
          invertido={i % 2 === 1}
          fondo={i % 2 === 1 ? "bg-papel-2" : "bg-papel"}
        />
      ))}

      {/* Cómo funciona la compra: una sola vez, vale para todo el catálogo. */}
      {productos.length > 0 ? (
        <section className="bg-tostado-tenue py-12">
          <div className="contenedor">
            <ul className="grid gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
              {comoFunciona.map((detalle, i) => (
                <li
                  key={i}
                  className="flex gap-3 text-[1.05rem] leading-snug text-tinta-suave"
                >
                  <span aria-hidden="true" className="text-verde-claro">
                    ❧
                  </span>
                  <TextoEditable clave={`compra_detalle_${i + 1}`}>
                    {detalle}
                  </TextoEditable>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ================================================================
          TALLERES
          ================================================================ */}
      <BloqueTalleres talleres={talleres} textos={textos} />

      {/* ================================================================
          SOBRE MÍ
          ================================================================ */}
      <SeccionSobreMi textos={textos} />

      {/* ================================================================
          PREGUNTAS
          ================================================================ */}
      <section className="contenedor py-20 md:py-28">
        <TextoEditable
          clave="faq_titulo"
          como="h2"
          className="block text-center text-[2rem] leading-tight text-tinta sm:text-[2.4rem]"
        >
          Preguntas frecuentes
        </TextoEditable>
        <Preguntas textos={textos} className="mx-auto mt-12 max-w-2xl" />
      </section>

      {/* ================================================================
          CONTACTO
          ================================================================ */}
      <BloqueContacto textos={textos} />
    </>
  );
}
