import Link from "next/link";
import BloqueContacto from "../components/BloqueContacto";
import { getTextos, t } from "@/lib/datos";
import { urlPublica } from "@/lib/utils";
import Image from "next/image";

export const revalidate = 300;

export const metadata = {
  title: "Sobre mí",
  description:
    "Tatiana Galera, Licenciada en Psicopedagogía y profesora de Nivel Inicial. Mi historia y por qué nació CISUR.",
  alternates: { canonical: "/sobre-mi" },
};

export default async function SobreMi() {
  const textos = await getTextos();
  const retrato = urlPublica(t(textos, "sobre_foto_path", ""));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Tatiana Galera",
    jobTitle: "Licenciada en Psicopedagogía",
    worksFor: { "@type": "Organization", name: "CISUR — Centro Integral Sur" },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Mar del Plata",
      addressRegion: "Buenos Aires",
      addressCountry: "AR",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="contenedor py-16 md:py-24">
        <header className="grid items-center gap-12 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="versalitas text-verde-claro">Sobre mí</p>
            <h1 className="mt-4 text-[2.3rem] leading-[1.1] text-tinta sm:text-[3rem]">
              Hola, soy Tatiana
            </h1>
            <p className="mt-5 text-[1.32rem] leading-relaxed text-tinta-suave">
              Y esta es un poquito de mi historia.
            </p>
            <hr className="filete mt-8 max-w-xs" />
            <p className="mt-4 text-[1.05rem] text-tinta-tenue">
              Licenciada en Psicopedagogía · Profesora de Nivel Inicial y
              Maternal · Matrícula Provincial N.º 205281
            </p>
          </div>

          {retrato ? (
            <div className="relative mx-auto aspect-[3/4] w-full max-w-[280px] overflow-hidden rounded-[3px] ring-1 ring-tinta/10">
              <Image
                src={retrato}
                alt="Tatiana Galera"
                fill
                sizes="280px"
                priority
                className="object-cover"
              />
            </div>
          ) : (
            <div
              aria-hidden="true"
              className="mx-auto flex aspect-[3/4] w-full max-w-[280px] items-center justify-center rounded-[3px] bg-salvia-tenue text-4xl text-verde-claro"
            >
              ❧
            </div>
          )}
        </header>

        <div className="prosa mx-auto mt-16 text-tinta-suave">
          <p>
            Desde muy chica supe que había algo del jardín que me hacía sentir en
            casa. Mi mamá es docente, así que crecí entre salas, juegos,
            canciones y el enorme amor que implica enseñar. Recuerdo admirar a
            mis maestras y pensar: «algún día quiero estar ahí».
          </p>

          <p>
            Ese sueño me llevó a estudiar el Profesorado de Nivel Inicial y
            Maternal. Mis primeros pasos estuvieron llenos de desafíos,
            aprendizajes y personas que fueron dejando huellas en mí. Después
            llegaron nuevos jardines, nuevos equipos y docentes con una enorme
            trayectoria que me enseñaron muchísimo. Ahí entendí que siempre había
            algo más por aprender.
          </p>

          <p>
            Por eso decidí seguir mi camino y estudiar la Licenciatura en
            Psicopedagogía. Fueron años intensos, llenos de desafíos, pero
            también de personas maravillosas que todavía hoy siguen
            acompañándome.
          </p>

          <p>
            En 2020, en plena pandemia, llegó uno de los momentos más importantes
            de mi vida: me recibí mientras esperaba a mi primera hija, Josefina.
            No fue la graduación que imaginaba, pero sí una de las más
            emocionantes. Estaba rodeada del amor de mi familia y comenzaba una
            nueva etapa: ser mamá.
          </p>

          <p>
            Después llegaron nuevos desafíos profesionales. Formé parte de
            equipos de orientación escolar en primaria y secundaria, aprendiendo
            desde otra mirada. Pero había algo que seguía latiendo muy fuerte: el
            jardín. Así apareció la oportunidad de acompañar el crecimiento de
            una institución maternal desde un rol directivo. Fue una experiencia
            que me transformó profundamente, trabajando junto a docentes
            comprometidos, familias y muchísimos niños que también me enseñaron.
          </p>

          <p>
            Y mientras ese proyecto crecía… también crecía mi familia. Llegó
            Martino y, con él, el desafío de aprender a equilibrar tantos roles:
            mamá de dos, profesional, pareja, hija y mujer.
          </p>

          <blockquote>
            Hoy miro hacia atrás y entiendo que cada etapa, cada persona y cada
            experiencia me trajeron hasta acá. Porque creo que nunca dejamos de
            aprender. Nunca dejamos de crecer.
          </blockquote>

          <p>
            Durante años recibí familias con la misma preocupación: «¿cómo puedo
            ayudar a mi hijo en casa?». Ahí entendí que hacía falta un espacio
            para acompañar también a las familias, no sólo a los chicos.
          </p>

          <p>
            Y por eso hoy nace este nuevo espacio. Un lugar donde se unen la
            educación, la psicopedagogía, el acompañamiento y, sobre todo, el amor
            por lo que hago.
          </p>

          <p>Gracias por estar acá. Bienvenidos a este nuevo comienzo. 💚</p>
        </div>

        <div className="mt-16 text-center">
          <Link
            href="/guias"
            className="inline-block rounded-[2px] bg-verde px-8 py-4 text-papel transition-colors hover:bg-verde-oscuro"
          >
            Ver los materiales
          </Link>
        </div>
      </article>

      <BloqueContacto textos={textos} />
    </>
  );
}
