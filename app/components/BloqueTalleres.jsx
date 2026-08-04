import Image from "next/image";
import TextoEditable from "./TextoEditable";
import { t } from "@/lib/datos";
import { formatearFecha, linkWhatsApp, safeHref, urlPublica } from "@/lib/utils";

/**
 * Vitrina de talleres. No se venden online: el CTA va al WhatsApp de Tati,
 * que es donde ella ya coordina con los colegios.
 */
export default function BloqueTalleres({ talleres = [], textos }) {
  const whatsapp = t(textos, "contacto_whatsapp", "542234474674");
  const urlWhatsapp = safeHref(
    linkWhatsApp(
      whatsapp,
      "¡Hola Tati! Quería consultarte por un taller de alfabetización.",
    ),
  );

  return (
    <section
      id="talleres"
      className="ancla border-y border-papel-3 bg-papel-2 py-20 md:py-28"
    >
      <div className="contenedor">
        <div className="mx-auto max-w-2xl text-center">
          <TextoEditable
            clave="talleres_kicker"
            como="p"
            className="versalitas text-verde-claro"
          >
            Presencial
          </TextoEditable>

          <TextoEditable
            clave="talleres_titulo"
            como="h2"
            className="mt-4 text-[2rem] leading-tight text-tinta sm:text-[2.4rem]"
          >
            Talleres para colegios e instituciones
          </TextoEditable>

          <TextoEditable
            clave="talleres_texto"
            como="p"
            multilinea
            className="mt-5 leading-relaxed text-tinta-suave"
          >
            Acompaño a las familias brindándoles herramientas para comprender y
            acompañar el proceso de alfabetización de sus hijos e hijas con mayor
            seguridad y confianza. En cada encuentro trabajamos temas como el
            desarrollo del lenguaje, el juego y la lectura compartida, siempre
            adaptando la propuesta a la realidad y las necesidades de cada
            institución.
          </TextoEditable>
        </div>

        {talleres.length > 0 ? (
          <ul className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {talleres.slice(0, 3).map((taller) => {
              const imagen = urlPublica(taller.imagen_path);
              return (
                <li
                  key={taller.id}
                  className="overflow-hidden rounded-[3px] border border-papel-3 bg-papel"
                >
                  {imagen ? (
                    <div className="relative aspect-[4/3] w-full">
                      <Image
                        src={imagen}
                        alt={taller.titulo}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 340px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      aria-hidden="true"
                      className="flex aspect-[4/3] w-full items-center justify-center bg-salvia-tenue text-3xl text-verde-claro"
                    >
                      ❧
                    </div>
                  )}

                  <div className="p-6">
                    <h3 className="text-[1.32rem] leading-snug text-tinta">
                      {taller.titulo}
                    </h3>
                    {taller.lugar || taller.fecha ? (
                      <p className="mt-2 text-[1.05rem] text-tinta-tenue">
                        {[taller.lugar, formatearFecha(taller.fecha)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                    {taller.descripcion ? (
                      <p className="mt-3 text-[1.1rem] leading-relaxed text-tinta-suave">
                        {taller.descripcion}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        {urlWhatsapp ? (
          <div className="mt-14 text-center">
            <TextoEditable
              clave="talleres_cta"
              como="a"
              href={urlWhatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-[2px] border border-verde px-8 py-4 text-verde transition-colors hover:bg-verde hover:text-papel"
            >
              Consultar por un taller
            </TextoEditable>
          </div>
        ) : null}
      </div>
    </section>
  );
}
