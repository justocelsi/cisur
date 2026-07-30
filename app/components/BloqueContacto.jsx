import { t } from "@/lib/datos";
import { linkWhatsApp, safeHref } from "@/lib/utils";

export default function BloqueContacto({ textos }) {
  const whatsapp = t(textos, "contacto_whatsapp", "542234474674");
  const instagram = String(
    t(textos, "contacto_instagram", "cisur.mdp"),
  ).replace(/^@/, "");

  const urlWhatsapp = safeHref(
    linkWhatsApp(whatsapp, "¡Hola Tati! Te escribo desde la web de CISUR."),
  );
  const urlInstagram = safeHref(`https://www.instagram.com/${instagram}`);

  return (
    <section id="contacto" className="border-t border-papel-3 bg-verde py-20 text-papel md:py-24">
      <div className="contenedor-angosto text-center">
        <h2 className="text-[2rem] leading-tight sm:text-[2.4rem]">
          {t(textos, "contacto_titulo", "Hablemos")}
        </h2>
        <p className="mx-auto mt-5 max-w-lg leading-relaxed text-salvia">
          {t(
            textos,
            "contacto_texto",
            "Consultas por la guía, turnos en consultorio o talleres para tu institución.",
          )}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {urlWhatsapp ? (
            <a
              href={urlWhatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-[2px] bg-papel px-8 py-4 text-verde transition-colors hover:bg-papel-2 sm:w-auto"
            >
              Escribir por WhatsApp
            </a>
          ) : null}
          {urlInstagram ? (
            <a
              href={urlInstagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-[2px] border border-salvia/50 px-8 py-4 text-papel transition-colors hover:border-papel sm:w-auto"
            >
              Instagram @{instagram}
            </a>
          ) : null}
        </div>

        <p className="mt-10 text-[1.05rem] text-salvia/70">
          {t(textos, "contacto_ciudad", "Mar del Plata, Buenos Aires")}
        </p>
      </div>
    </section>
  );
}
