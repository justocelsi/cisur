import TextoEditable from "./TextoEditable";
import { t } from "@/lib/datos";

/**
 * El frasco de las invitaciones.
 *
 * Va sobre el tostado de la marca con una tarjeta color papel encima, que es
 * la composición de las piezas de Instagram (fondo camel + nota crema + verde).
 * Le da a la landing el único bloque con fondo cálido, y funciona como respiro
 * entre el argumento de la guía y la historia personal.
 */
export default function BloqueFrasco({ textos }) {
  const invitaciones = [
    t(textos, "frasco_inv_1", "Preparar una receta"),
    t(textos, "frasco_inv_2", "Salir a caminar"),
    t(textos, "frasco_inv_3", "Leer un cuento"),
    t(textos, "frasco_inv_4", "Escribir un mensaje"),
    t(textos, "frasco_inv_5", "Inventar una historia"),
  ];

  return (
    <section className="bg-tostado py-20 md:py-28">
      <div className="contenedor">
        <div className="mx-auto max-w-3xl rounded-[3px] bg-papel p-8 shadow-[0_20px_50px_-24px_rgba(31,42,28,0.4)] sm:p-12 md:p-14">
          <TextoEditable
            clave="frasco_kicker"
            como="p"
            className="versalitas text-verde-claro"
          >
            Jugar también es alfabetizar
          </TextoEditable>

          <TextoEditable
            clave="frasco_titulo"
            como="h2"
            className="mt-5 text-[2rem] leading-tight text-tinta sm:text-[2.4rem]"
          >
            El frasco de las invitaciones
          </TextoEditable>

          <TextoEditable
            clave="frasco_lead"
            como="p"
            multilinea
            className="mt-6 text-[1.32rem] leading-relaxed text-tinta-suave"
          >
            ¿Sabías que el juego es una de las mejores herramientas para la
            alfabetización? Uno de mis favoritos es el frasco de las
            invitaciones.
          </TextoEditable>

          <TextoEditable
            clave="frasco_texto"
            como="p"
            multilinea
            className="mt-5 leading-relaxed text-tinta-suave"
          >
            Son propuestas para disfrutar en familia, compartir tiempo de calidad
            y descubrir que la alfabetización puede estar presente en los
            momentos más simples.
          </TextoEditable>

          <hr className="filete my-9" />

          <p className="versalitas text-tinta-tenue">Algunas invitaciones</p>
          <ul className="mt-5 flex flex-wrap gap-3">
            {invitaciones.map((invitacion, i) => (
              <li
                key={i}
                className="rounded-full border border-tostado-claro bg-tostado-tenue px-5 py-2 text-[1.1rem] text-tinta-suave"
              >
                {invitacion}
              </li>
            ))}
          </ul>

          <TextoEditable
            clave="frasco_cierre"
            como="p"
            multilinea
            className="mt-9 leading-relaxed text-tinta-suave"
          >
            Cada una de ellas fue pensada para que la lectura, la escritura, la
            conversación y el juego aparezcan de manera natural, respetando los
            tiempos, intereses y posibilidades de cada familia.
          </TextoEditable>
        </div>
      </div>
    </section>
  );
}
