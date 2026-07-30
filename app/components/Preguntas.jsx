import { t } from "@/lib/datos";

/**
 * FAQ con <details>/<summary>: acordeón accesible, sin una línea de
 * JavaScript. Funciona con teclado, con lector de pantalla y con JS
 * deshabilitado, y el texto de las respuestas queda en el HTML para Google.
 *
 * Las preguntas se editan desde el panel, no acá, porque son 12 textos y
 * dentro de un <summary> el editor inline queda incómodo.
 */
const PREGUNTAS = [
  {
    clave: "faq_1",
    p: "¿Para qué edades sirve?",
    r: "Está pensada para familias con chicos que están construyendo la lectura y la escritura: aproximadamente desde los 4 hasta los 8 años. Los capítulos sobre lenguaje oral y vínculo con la lectura sirven incluso antes.",
  },
  {
    clave: "faq_2",
    p: "¿Reemplaza a la escuela o a un tratamiento?",
    r: "No. La guía es material de orientación para acompañar desde casa. No reemplaza la enseñanza sistemática de la escuela ni una evaluación psicopedagógica cuando hace falta. El capítulo 7 justamente te ayuda a reconocer cuándo conviene consultar.",
  },
  {
    clave: "faq_3",
    p: "¿Cómo la recibo?",
    r: "No hay archivo que se pueda perder. Después de pagar, la guía queda disponible en tu cuenta, en la sección «Mis materiales», y la leés online cuando quieras.",
  },
  {
    clave: "faq_4",
    p: "¿Puedo descargarla o imprimirla?",
    r: "La lectura es online. Es material protegido por derecho de autor y la compra habilita el uso personal, así que no incluye descarga ni reventa.",
  },
  {
    clave: "faq_5",
    p: "¿Necesito saber de tecnología?",
    r: "No. Te registrás con tu mail, pagás con Mercado Pago como en cualquier compra online y la guía aparece en tu cuenta.",
  },
  {
    clave: "faq_6",
    p: "¿Tengo dudas después de leerla?",
    r: "Podés escribirme por WhatsApp o Instagram. También trabajo con familias en consultorio y armo talleres para colegios.",
  },
];

export default function Preguntas({ textos, className = "" }) {
  return (
    <div className={className}>
      {PREGUNTAS.map(({ clave, p, r }) => (
        <details
          key={clave}
          className="group border-b border-papel-3 [&_summary::-webkit-details-marker]:hidden"
        >
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-[1.21rem] text-tinta">
            <span>{t(textos, `${clave}_p`, p)}</span>
            <span
              aria-hidden="true"
              className="mt-1 shrink-0 text-verde-claro transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="pb-6 pr-10 leading-relaxed text-tinta-suave">
            {t(textos, `${clave}_r`, r)}
          </p>
        </details>
      ))}
    </div>
  );
}
