import Image from "next/image";
import TextoEditable from "./TextoEditable";
import { t } from "@/lib/datos";
import { urlPublica } from "@/lib/utils";

/**
 * "Hola, soy Tatiana".
 *
 * La foto sale de `sobre_foto_path`, que puede apuntar a un archivo del repo
 * (`/tati/…`) o a una que Tati suba desde el panel. Mientras no haya ninguna,
 * dibuja un ornamento en vez de dejar un hueco: la página nunca se ve rota.
 */
export default function SeccionSobreMi({ textos }) {
  const retrato = urlPublica(t(textos, "sobre_foto_path", ""));

  return (
    <section
      id="sobre-mi"
      className="ancla border-b border-papel-3 bg-papel-2 py-20 md:py-28"
    >
      <div className="contenedor">
        <div className="grid items-center gap-14 md:grid-cols-[0.8fr_1.2fr] md:gap-20">
          <div className="mx-auto w-full max-w-[300px]">
            {retrato ? (
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[3px] shadow-[0_18px_40px_-20px_rgba(31,42,28,0.5)] ring-1 ring-tinta/10">
                <Image
                  src={retrato}
                  alt="Tatiana Galera"
                  fill
                  sizes="(max-width: 768px) 70vw, 300px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div
                aria-hidden="true"
                className="flex aspect-[3/4] w-full items-center justify-center rounded-[3px] bg-salvia-tenue text-4xl text-verde-claro"
              >
                ❧
              </div>
            )}
          </div>

          <div>
            <TextoEditable
              clave="sobre_kicker"
              como="p"
              className="versalitas text-verde-claro"
            >
              Quién está detrás
            </TextoEditable>

            <TextoEditable
              clave="sobre_titulo"
              como="h2"
              className="mt-4 text-[2.1rem] leading-tight text-tinta sm:text-[2.5rem]"
            >
              Hola, soy Tatiana
            </TextoEditable>

            <div className="prosa mt-7 text-tinta-suave">
              <TextoEditable clave="sobre_p1" como="p" multilinea>
                Desde muy chica supe que quería dedicarme a la educación. Crecí
                entre jardines, juegos y canciones gracias a mi mamá, que es
                docente. Admiraba a mis maestras y soñaba con algún día ocupar
                ese lugar.
              </TextoEditable>

              <TextoEditable clave="sobre_p2" como="p" multilinea>
                Ese sueño me llevó a estudiar el Profesorado de Nivel Inicial y,
                con el tiempo, la Licenciatura en Psicopedagogía. En 2020,
                mientras esperaba a mi primera hija, me recibí en plena pandemia.
                Después llegaron nuevos desafíos: los equipos de orientación
                escolar y acompañar el crecimiento de una institución maternal
                desde un rol directivo.
              </TextoEditable>

              <TextoEditable clave="sobre_p3" como="p" multilinea>
                Durante años recibí familias con la misma preocupación: «¿cómo
                puedo ayudar a mi hijo en casa?». Ahí entendí que hacía falta un
                espacio para acompañar también a las familias, no sólo a los
                chicos. Por eso nació CISUR.
              </TextoEditable>
            </div>

            <hr className="filete mt-8 max-w-sm" />
            <TextoEditable
              clave="sobre_credenciales"
              como="p"
              multilinea
              className="mt-4 text-[1.05rem] text-tinta-tenue"
            >
              Licenciada en Psicopedagogía · Profesora de Nivel Inicial y
              Maternal · Matrícula Provincial N.º 205281
            </TextoEditable>
          </div>
        </div>
      </div>
    </section>
  );
}
