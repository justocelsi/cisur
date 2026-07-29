import Link from "next/link";
import { getTextos, t } from "@/lib/datos";
import { linkWhatsApp, safeHref } from "@/lib/utils";

export const revalidate = 3600;

export const metadata = {
  title: "Botón de arrepentimiento",
  description:
    "Ejercé tu derecho de revocación de compra dentro de los 10 días corridos, conforme a la Ley 24.240.",
  alternates: { canonical: "/legales/arrepentimiento" },
};

/**
 * Botón de arrepentimiento.
 *
 * Obligatorio para todo comercio electrónico en Argentina según la Resolución
 * 424/2020 de la Secretaría de Comercio Interior: tiene que estar accesible
 * desde la home y permitir iniciar la revocación de la compra.
 */
export default async function Arrepentimiento() {
  const textos = await getTextos();
  const whatsapp = t(textos, "contacto_whatsapp", "542234474674");

  const urlWhatsapp = safeHref(
    linkWhatsApp(
      whatsapp,
      "Hola, quiero ejercer mi derecho de arrepentimiento sobre una compra en la web de CISUR. Mi mail de cuenta es: ",
    ),
  );

  return (
    <>
      <h1 className="text-[2rem] leading-tight text-tinta">
        Botón de arrepentimiento
      </h1>

      <p>
        Si compraste en este sitio y te arrepentiste, tenés{" "}
        <strong>10 días corridos</strong> desde la compra para revocarla{" "}
        <strong>sin costo y sin tener que justificar el motivo</strong>, conforme
        al artículo 34 de la Ley 24.240 de Defensa del Consumidor y a la
        Resolución 424/2020.
      </p>

      <h2>Cómo hacerlo</h2>
      <p>
        Escribinos por WhatsApp indicando <strong>el mail de tu cuenta</strong> y
        que querés ejercer el derecho de arrepentimiento. Con eso alcanza: no
        necesitás explicar nada más.
      </p>

      <p className="not-prose">
        {urlWhatsapp ? (
          <a
            href={urlWhatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center justify-center rounded-[2px] bg-terracota px-8 py-4 text-papel no-underline transition-colors hover:bg-terracota-oscuro"
          >
            Iniciar mi arrepentimiento por WhatsApp
          </a>
        ) : null}
      </p>

      <h2>Qué pasa después</h2>
      <ul>
        <li>
          Te confirmamos la recepción del pedido y damos de baja el acceso al
          material.
        </li>
        <li>
          Iniciamos la devolución del <strong>100% de lo que pagaste</strong>{" "}
          dentro de las 72 horas hábiles, por el mismo medio de pago.
        </li>
        <li>
          El tiempo hasta que veas el dinero acreditado depende de Mercado Pago y
          de tu banco.
        </li>
      </ul>

      <h2>Datos de la responsable</h2>
      <p>
        Tatiana Galera (CISUR — Centro Integral Sur)
        <br />
        Mar del Plata, provincia de Buenos Aires, Argentina
        <br />
        WhatsApp: <strong>+54 223 447-4674</strong>
      </p>

      <p>
        Ver también la{" "}
        <Link href="/legales/reembolsos">política completa de reembolsos</Link>.
      </p>
    </>
  );
}
