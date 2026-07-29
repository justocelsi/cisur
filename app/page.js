import Link from "next/link";
import TextoEditable from "./components/TextoEditable";
import PortadaGuia from "./components/PortadaGuia";
import BotonComprar from "./components/BotonComprar";
import BloqueTalleres from "./components/BloqueTalleres";
import BloqueContacto from "./components/BloqueContacto";
import Preguntas from "./components/Preguntas";
import { getProductoDestacado, getTalleres, getTextos, t } from "@/lib/datos";
import { formatearPrecio, urlPublica, urlSitio } from "@/lib/utils";

// Estático, revalidado cada 5 minutos: la landing carga al instante y no
// consume egress de Supabase en cada visita. Cuando Tati edita un texto lo ve
// al toque en su navegador (optimista) y para el resto entra en el próximo
// revalidado.
export const revalidate = 300;

export default async function Inicio() {
  const [producto, textos, talleres] = await Promise.all([
    getProductoDestacado(),
    getTextos(),
    getTalleres(),
  ]);

  const dolores = [
    t(textos, "dolor_1", "¿Lo estaré ayudando bien?"),
    t(textos, "dolor_2", "¿Debería practicar más en casa?"),
    t(textos, "dolor_3", "¿Es normal que escriba así?"),
    t(textos, "dolor_4", "¿Tengo que corregirle los errores?"),
  ];

  const bullets = [
    t(textos, "guia_bullet_1", "Entender por qué la alfabetización empieza mucho antes de primer grado."),
    t(textos, "guia_bullet_2", "Reconocer las cuatro etapas de la escritura y qué está pensando tu hijo en cada una."),
    t(textos, "guia_bullet_3", "Dejar de corregir por reflejo y aprender a preguntar antes."),
    t(textos, "guia_bullet_4", "Ideas concretas para la vida cotidiana: la lista del super, una receta, un cuento antes de dormir."),
    t(textos, "guia_bullet_5", "Saber cuándo conviene consultar con un profesional y cuándo simplemente hay que dar tiempo."),
  ];

  const indice = Array.isArray(producto?.indice) ? producto.indice : [];

  // Datos estructurados: ayudan a que Google muestre el precio y el autor.
  const jsonLd = producto
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: producto.titulo,
        description: producto.descripcion ?? undefined,
        image: urlPublica(producto.portada_path) ?? undefined,
        brand: { "@type": "Brand", name: "CISUR — Centro Integral Sur" },
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
              className="mt-5 text-[2.4rem] leading-[1.08] text-tinta sm:text-[3.1rem] md:text-[3.5rem]"
            >
              El rol de la familia en el proceso de alfabetización
            </TextoEditable>

            <TextoEditable
              clave="hero_texto"
              como="p"
              multilinea
              className="mt-6 max-w-xl text-[1.15rem] leading-relaxed text-tinta-suave"
            >
              Una guía práctica para entender cómo aprenden a leer y escribir tus
              hijos, y cómo acompañarlos desde casa con confianza, sin presiones y
              sin convertirte en su maestra.
            </TextoEditable>

            {producto ? (
              <div className="mt-9 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                <Link
                  href={`/guias/${producto.slug}#comprar`}
                  className="inline-flex w-full items-center justify-center rounded-[2px] bg-verde px-8 py-4 text-[1.05rem] text-papel transition-colors hover:bg-tinta sm:w-auto"
                >
                  {t(textos, "hero_cta", "Quiero la guía")}
                </Link>
                <p className="text-sm text-tinta-tenue">
                  <span className="text-tinta">
                    {formatearPrecio(producto.precio)}
                  </span>{" "}
                  · pago único · acceso inmediato
                </p>
              </div>
            ) : (
              <p className="mt-9 rounded-[2px] border border-arena bg-papel-2 px-5 py-4 text-sm text-tinta-suave">
                El catálogo se está cargando. Si sos la administradora del sitio,
                creá el primer material desde el{" "}
                <Link href="/panel" className="text-verde underline">
                  panel
                </Link>
                .
              </p>
            )}

            <hr className="filete mt-10 max-w-xs" />
            <TextoEditable
              clave="hero_firma"
              como="p"
              className="mt-4 text-sm text-tinta-tenue"
            >
              Lic. Tatiana Galera · Psicopedagoga · Mat. Prov. 205281
            </TextoEditable>
          </div>

          <div className="mx-auto w-full max-w-[300px] md:max-w-[340px]">
            <PortadaGuia producto={producto} prioridad />
          </div>
        </div>
      </section>

      {/* ================================================================
          ¿TE SUENA?
          ================================================================ */}
      <section className="contenedor py-20 md:py-28">
        <TextoEditable
          clave="dolor_titulo"
          como="h2"
          className="mx-auto max-w-2xl text-center text-[1.9rem] leading-tight text-tinta sm:text-[2.3rem]"
        >
          ¿Alguna de estas preguntas te resulta familiar?
        </TextoEditable>

        <ul className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
          {dolores.map((pregunta, i) => (
            <li
              key={i}
              className="rounded-[3px] border border-papel-3 bg-papel-2 px-6 py-5 text-[1.05rem] italic text-tinta-suave"
            >
              «{pregunta}»
            </li>
          ))}
        </ul>

        <TextoEditable
          clave="dolor_cierre"
          como="p"
          multilinea
          className="mx-auto mt-12 max-w-xl text-center text-[1.1rem] leading-relaxed text-tinta-suave"
        >
          Detrás de estas preguntas hay mucho amor y muchas ganas de acompañar.
          También, muchas veces, la sensación de no saber por dónde empezar. Esta
          guía es para eso.
        </TextoEditable>
      </section>

      {/* ================================================================
          CITA
          ================================================================ */}
      <section className="border-y border-papel-3 bg-verde py-20 text-papel md:py-24">
        <div className="contenedor-angosto text-center">
          <p aria-hidden="true" className="text-2xl text-salvia/60">
            ❧
          </p>
          <blockquote className="mt-6 text-[1.5rem] leading-[1.45] text-papel sm:text-[1.85rem]">
            «La alfabetización no comienza cuando el niño o la niña ingresan a la
            escuela primaria. Comienza mucho antes, en cada conversación, en cada
            cuento compartido y en cada oportunidad de descubrir que las palabras
            tienen un significado.»
          </blockquote>
          <p className="mt-7 versalitas text-salvia">
            Capítulo 1 de la guía
          </p>
        </div>
      </section>

      {/* ================================================================
          QUÉ VAS A ENCONTRAR
          ================================================================ */}
      <section className="contenedor py-20 md:py-28">
        {/* Sin índice cargado, la segunda columna quedaría vacía y el texto
            comprimido en media pantalla: colapsamos a una sola columna. */}
        <div
          className={`grid gap-14 md:gap-20 ${
            indice.length > 0 ? "md:grid-cols-2" : "mx-auto max-w-2xl"
          }`}
        >
          <div>
            <TextoEditable
              clave="guia_titulo"
              como="h2"
              className="text-[1.9rem] leading-tight text-tinta sm:text-[2.3rem]"
            >
              Qué vas a encontrar adentro
            </TextoEditable>

            <TextoEditable
              clave="guia_texto"
              como="p"
              multilinea
              className="mt-5 text-[1.05rem] leading-relaxed text-tinta-suave"
            >
              Siete capítulos que van de lo general a lo concreto: qué significa
              realmente alfabetizar, cómo piensan los chicos cuando escriben
              «mal», cuáles son las etapas de la escritura y qué podés hacer en
              casa cada día. Con propuestas de reflexión al final de cada
              capítulo.
            </TextoEditable>

            <ul className="lista mt-8">
              {bullets.map((b, i) => (
                <li key={i} className="text-tinta-suave">
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {indice.length > 0 ? (
            <div className="rounded-[3px] border border-papel-3 bg-papel-2 p-8 md:p-10">
              <h3 className="versalitas text-verde-claro">Índice</h3>
              <ol className="mt-6 space-y-4">
                {indice.map((capitulo, i) => (
                  <li key={i} className="flex gap-4">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-sm text-salvia"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="leading-snug text-tinta-suave">
                      {capitulo}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      </section>

      {/* ================================================================
          SOBRE TATI
          ================================================================ */}
      <section
        id="sobre-mi"
        className="border-y border-papel-3 bg-papel-2 py-20 md:py-28"
      >
        <div className="contenedor-angosto">
          <TextoEditable
            clave="sobre_titulo"
            como="h2"
            className="text-[1.9rem] leading-tight text-tinta sm:text-[2.3rem]"
          >
            Hola, soy Tatiana
          </TextoEditable>

          <div className="prosa mt-7 text-tinta-suave">
            <TextoEditable clave="sobre_p1" como="p" multilinea>
              Desde muy chica supe que quería dedicarme a la educación. Crecí
              entre jardines, juegos y canciones gracias a mi mamá, que es
              docente. Admiraba a mis maestras y soñaba con algún día ocupar ese
              lugar.
            </TextoEditable>

            <TextoEditable clave="sobre_p2" como="p" multilinea>
              Ese sueño me llevó a estudiar el Profesorado de Nivel Inicial y, con
              el tiempo, la Licenciatura en Psicopedagogía. En 2020, mientras
              esperaba a mi primera hija, me recibí en plena pandemia. Después
              llegaron nuevos desafíos: los equipos de orientación escolar y
              acompañar el crecimiento de una institución maternal desde un rol
              directivo.
            </TextoEditable>

            <TextoEditable clave="sobre_p3" como="p" multilinea>
              Durante años recibí familias con la misma preocupación: «¿cómo puedo
              ayudar a mi hijo en casa?». Ahí entendí que hacía falta un espacio
              para acompañar también a las familias, no sólo a los chicos. Por eso
              nació CISUR.
            </TextoEditable>
          </div>

          <Link
            href="/sobre-mi"
            className="mt-8 inline-block text-verde underline decoration-salvia decoration-1 underline-offset-4 hover:decoration-verde"
          >
            Leer mi historia completa
          </Link>
        </div>
      </section>

      {/* ================================================================
          COMPRA
          ================================================================ */}
      {producto ? (
        <section id="comprar" className="contenedor py-20 md:py-28">
          <div className="mx-auto max-w-3xl rounded-[3px] border border-arena bg-papel-2 p-8 sm:p-12">
            <div className="grid gap-10 sm:grid-cols-[0.8fr_1.2fr] sm:items-center">
              <div className="mx-auto w-full max-w-[200px]">
                <PortadaGuia producto={producto} />
              </div>

              <div>
                <TextoEditable
                  clave="compra_titulo"
                  como="h2"
                  className="text-[1.7rem] leading-tight text-tinta sm:text-[2rem]"
                >
                  Llevate la guía
                </TextoEditable>

                <div className="mt-5 flex flex-wrap items-baseline gap-3">
                  <span className="text-[2.2rem] leading-none text-verde">
                    {formatearPrecio(producto.precio)}
                  </span>
                  {producto.precio_lista &&
                  Number(producto.precio_lista) > Number(producto.precio) ? (
                    <span className="text-lg text-tinta-tenue line-through">
                      {formatearPrecio(producto.precio_lista)}
                    </span>
                  ) : null}
                  <span className="text-sm text-tinta-tenue">pago único</span>
                </div>

                <ul className="lista mt-6 text-[0.98rem] text-tinta-suave">
                  <li>{t(textos, "compra_detalle_1", "Acceso inmediato después del pago")}</li>
                  <li>{t(textos, "compra_detalle_2", "Lectura online desde celular, tablet o computadora")}</li>
                  <li>{t(textos, "compra_detalle_3", "Sin vencimiento: la leés cuando quieras")}</li>
                  <li>{t(textos, "compra_detalle_4", "Escrita por una psicopedagoga matriculada")}</li>
                </ul>

                <BotonComprar producto={producto} className="mt-8" />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ================================================================
          TALLERES
          ================================================================ */}
      <BloqueTalleres talleres={talleres} textos={textos} />

      {/* ================================================================
          PREGUNTAS
          ================================================================ */}
      <section className="contenedor py-20 md:py-28">
        <h2 className="text-center text-[1.9rem] leading-tight text-tinta sm:text-[2.3rem]">
          Preguntas frecuentes
        </h2>
        <Preguntas textos={textos} className="mx-auto mt-12 max-w-2xl" />
      </section>

      {/* ================================================================
          CONTACTO
          ================================================================ */}
      <BloqueContacto textos={textos} />
    </>
  );
}
