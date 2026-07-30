import Image from "next/image";
import BloqueContacto from "../components/BloqueContacto";
import { getTalleres, getTextos, t } from "@/lib/datos";
import { formatearFecha, linkWhatsApp, safeHref, urlPublica } from "@/lib/utils";

export const revalidate = 300;

export const metadata = {
  title: "Talleres",
  description:
    "Talleres de alfabetización para colegios, instituciones y familias en Mar del Plata. Conciencia fonológica, juego y lectura compartida.",
  alternates: { canonical: "/talleres" },
};

const EJES = [
  {
    titulo: "El rol de la familia",
    texto:
      "Qué significa acompañar sin reemplazar a la escuela, y por qué cinco minutos por día hacen una diferencia real.",
  },
  {
    titulo: "Conciencia fonológica",
    texto:
      "Rimas, sílabas y sonidos iniciales: cómo se trabaja jugando, sin cuadernos ni ejercicios repetitivos.",
  },
  {
    titulo: "Las etapas de la escritura",
    texto:
      "Aprender a leer las producciones de los chicos para entender qué están pensando, en lugar de sólo corregirlas.",
  },
  {
    titulo: "Juego y lectura compartida",
    texto:
      "Propuestas concretas con objetos de la casa, y cómo leer un cuento para que favorezca la alfabetización.",
  },
];

export default async function Talleres() {
  const [talleres, textos] = await Promise.all([getTalleres(), getTextos()]);

  const whatsapp = t(textos, "contacto_whatsapp", "542234474674");
  const urlWhatsapp = safeHref(
    linkWhatsApp(
      whatsapp,
      "¡Hola Tati! Quería consultarte por un taller de alfabetización para nuestra institución.",
    ),
  );

  return (
    <>
      <div className="contenedor py-16 md:py-24">
        <header className="mx-auto max-w-2xl text-center">
          <p className="versalitas text-verde-claro">Presencial</p>
          <h1 className="mt-4 text-[2.2rem] leading-tight text-tinta sm:text-[2.9rem]">
            {t(textos, "talleres_titulo", "Talleres para colegios e instituciones")}
          </h1>
          <p className="mt-5 text-[1.18rem] leading-relaxed text-tinta-suave">
            {t(
              textos,
              "talleres_texto",
              "Encuentros presenciales con familias y equipos docentes sobre alfabetización, conciencia fonológica, juego y lectura compartida. Se arman a medida de cada institución.",
            )}
          </p>
        </header>

        {/* Ejes de trabajo */}
        <section className="mt-20">
          <h2 className="text-center text-[1.7rem] leading-tight text-tinta sm:text-[2rem]">
            Qué trabajamos
          </h2>
          <ul className="mt-12 grid gap-8 sm:grid-cols-2">
            {EJES.map((eje) => (
              <li
                key={eje.titulo}
                className="rounded-[3px] border border-papel-3 bg-papel-2 p-7"
              >
                <h3 className="text-[1.22rem] text-tinta">{eje.titulo}</h3>
                <p className="mt-3 leading-relaxed text-tinta-suave">
                  {eje.texto}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Cómo funciona */}
        <section className="mt-24 rounded-[3px] border border-tostado-tenue bg-papel-2 p-8 sm:p-12">
          <h2 className="text-[1.7rem] leading-tight text-tinta sm:text-[2rem]">
            Cómo lo organizamos
          </h2>
          <ol className="lista-numerada mt-7">
            <li className="text-tinta-suave">
              Me escribís contándome de qué institución sos, con qué grupo
              trabajaríamos (familias, docentes, o ambos) y qué les preocupa.
            </li>
            <li className="text-tinta-suave">
              Armamos juntas la propuesta: duración, ejes, cantidad de
              encuentros y qué materiales hacen falta.
            </li>
            <li className="text-tinta-suave">
              Coordinamos fecha y honorarios, y me encargo de llevar todo
              preparado.
            </li>
          </ol>
        </section>

        {/* Talleres realizados */}
        {talleres.length > 0 ? (
          <section className="mt-24">
            <h2 className="text-center text-[1.7rem] leading-tight text-tinta sm:text-[2rem]">
              Talleres realizados
            </h2>
            <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {talleres.map((taller) => {
                const imagen = urlPublica(taller.imagen_path);
                return (
                  <li
                    key={taller.id}
                    className="overflow-hidden rounded-[3px] border border-papel-3 bg-papel-2"
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
                      <h3 className="text-[1.22rem] leading-snug text-tinta">
                        {taller.titulo}
                      </h3>
                      {taller.lugar || taller.fecha ? (
                        <p className="mt-2 text-[0.95rem] text-tinta-tenue">
                          {[taller.lugar, formatearFecha(taller.fecha)]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      ) : null}
                      {taller.descripcion ? (
                        <p className="mt-3 text-[1.02rem] leading-relaxed text-tinta-suave">
                          {taller.descripcion}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {urlWhatsapp ? (
          <div className="mt-20 text-center">
            <a
              href={urlWhatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-[2px] bg-verde px-8 py-4 text-papel transition-colors hover:bg-verde-oscuro"
            >
              {t(textos, "talleres_cta", "Consultar por un taller")}
            </a>
          </div>
        ) : null}
      </div>

      <BloqueContacto textos={textos} />
    </>
  );
}
