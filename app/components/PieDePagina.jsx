import Link from "next/link";
import Logo from "./Logo";
import { getTextos, t } from "@/lib/datos";
import { linkWhatsApp, safeHref } from "@/lib/utils";

export default async function PieDePagina() {
  const textos = await getTextos();

  const whatsapp = t(textos, "contacto_whatsapp", "542234474674");
  const instagram = t(textos, "contacto_instagram", "cisur.mdp");
  const ciudad = t(textos, "contacto_ciudad", "Mar del Plata, Buenos Aires");

  const urlWhatsapp = safeHref(
    linkWhatsApp(whatsapp, "¡Hola! Te escribo desde la web de CISUR."),
  );
  const urlInstagram = safeHref(
    `https://www.instagram.com/${String(instagram).replace(/^@/, "")}`,
  );

  return (
    <footer className="no-imprimir mt-24 border-t border-papel-3 bg-papel-2">
      <div className="contenedor grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-tinta-suave">
            Un espacio para acompañar procesos de aprendizaje y desarrollo, con
            las familias y con los chicos.
          </p>
          <p className="mt-4 text-sm text-tinta-tenue">{ciudad}</p>
        </div>

        <nav aria-label="Secciones del sitio">
          <h2 className="versalitas text-tinta-tenue">El sitio</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/guias" className="text-tinta-suave hover:text-verde">
                Materiales
              </Link>
            </li>
            <li>
              <Link href="/talleres" className="text-tinta-suave hover:text-verde">
                Talleres
              </Link>
            </li>
            <li>
              <Link href="/sobre-mi" className="text-tinta-suave hover:text-verde">
                Sobre mí
              </Link>
            </li>
            <li>
              <Link
                href="/mis-materiales"
                className="text-tinta-suave hover:text-verde"
              >
                Mis materiales
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Contacto">
          <h2 className="versalitas text-tinta-tenue">Contacto</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {urlWhatsapp ? (
              <li>
                <a
                  href={urlWhatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tinta-suave hover:text-verde"
                >
                  WhatsApp
                </a>
              </li>
            ) : null}
            {urlInstagram ? (
              <li>
                <a
                  href={urlInstagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tinta-suave hover:text-verde"
                >
                  Instagram @{String(instagram).replace(/^@/, "")}
                </a>
              </li>
            ) : null}
          </ul>
        </nav>

        <nav aria-label="Información legal">
          <h2 className="versalitas text-tinta-tenue">Legales</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link
                href="/legales/terminos"
                className="text-tinta-suave hover:text-verde"
              >
                Términos y condiciones
              </Link>
            </li>
            <li>
              <Link
                href="/legales/privacidad"
                className="text-tinta-suave hover:text-verde"
              >
                Privacidad
              </Link>
            </li>
            <li>
              <Link
                href="/legales/reembolsos"
                className="text-tinta-suave hover:text-verde"
              >
                Cambios y reembolsos
              </Link>
            </li>
            {/* Obligatorio y accesible desde la home: Res. 424/2020. */}
            <li>
              <Link
                href="/legales/arrepentimiento"
                className="text-tinta-suave hover:text-verde"
              >
                Botón de arrepentimiento
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-papel-3">
        <div className="contenedor flex flex-col gap-2 py-6 text-xs text-tinta-tenue sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Tatiana Galera. Todos los derechos
            reservados.
          </p>
          <p>Lic. en Psicopedagogía · Matrícula Provincial N.º 205281</p>
        </div>
      </div>
    </footer>
  );
}
