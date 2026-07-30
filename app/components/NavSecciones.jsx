"use client";

import { useEffect, useRef, useState } from "react";

// Tolerancia por encima del borde inferior del encabezado. Tiene que ser mayor
// que el aire que deja la utilidad `ancla` (1.25rem = 20px): al saltar a una
// sección, su borde queda justo ahí y sin este margen ganaría la anterior.
const TOLERANCIA = 32;

/**
 * Nav de secciones del one-pager.
 *
 * Es la segunda fila del encabezado, que está pegado arriba.
 *
 * CÓMO SE DECIDE LA SECCIÓN ACTIVA
 * Gana la última sección que ya empezó: la última cuyo borde superior quedó por
 * encima del borde inferior del encabezado. Se calcula leyendo la posición de
 * cada sección en cada cuadro de animación mientras se scrollea.
 *
 * Se probó primero con IntersectionObserver, que en teoría es más liviano, y
 * tenía dos agujeros: una sección alta ya está intersectando antes de cruzar el
 * borde, así que cruzarlo no cambia su estado y no dispara; y al saltar por
 * click, si ninguna sección observada cruza la franja de detección durante el
 * salto, no llega ningún aviso y el resaltado se queda en el anterior.
 *
 * Leer cinco rectángulos por cuadro no cuesta nada medible y no tiene casos
 * borde. El listener es pasivo y está limitado por requestAnimationFrame, así
 * que no bloquea el scroll ni corre más de una vez por cuadro.
 */
export default function NavSecciones({ secciones = [] }) {
  const [activa, setActiva] = useState(null);
  const refLista = useRef(null);

  useEffect(() => {
    if (secciones.length === 0) return;

    // En orden del documento: de eso depende que "la última que empezó" gane.
    const nodos = secciones
      .map((s) => document.getElementById(s.id))
      .filter(Boolean);
    if (nodos.length === 0) return;

    const altoEncabezado = () =>
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--alto-encabezado",
        ),
      ) || 130;

    function decidir() {
      const limite = altoEncabezado() + TOLERANCIA;
      let ganadora = null;
      for (const nodo of nodos) {
        if (nodo.getBoundingClientRect().top <= limite) ganadora = nodo.id;
      }
      // Arriba de todo (el hero) no hay ninguna: no se resalta nada, que es lo
      // correcto porque el hero no está en el nav.
      setActiva(ganadora);
    }

    let pendiente = false;
    function alScrollear() {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(() => {
        pendiente = false;
        decidir();
      });
    }

    decidir();
    window.addEventListener("scroll", alScrollear, { passive: true });
    window.addEventListener("resize", alScrollear);
    // Los saltos por click cambian el hash sin que medie un scroll continuo.
    window.addEventListener("hashchange", alScrollear);

    return () => {
      window.removeEventListener("scroll", alScrollear);
      window.removeEventListener("resize", alScrollear);
      window.removeEventListener("hashchange", alScrollear);
    };
  }, [secciones]);

  /**
   * En mobile la barra scrollea en horizontal: si la sección activa quedó fuera
   * de la vista, la traemos al centro. Sin esto, al bajar por la página el
   * resaltado se mueve a un ítem que no se ve.
   */
  useEffect(() => {
    if (!activa || !refLista.current) return;

    const lista = refLista.current;
    const item = lista.querySelector(`[data-seccion="${activa}"]`);
    if (!item) return;

    // Sólo si de verdad hay desborde horizontal (o sea, en pantallas chicas).
    if (lista.scrollWidth <= lista.clientWidth + 1) return;

    const destino =
      item.offsetLeft - lista.clientWidth / 2 + item.offsetWidth / 2;
    lista.scrollTo({ left: Math.max(0, destino), behavior: "smooth" });
  }, [activa]);

  if (secciones.length === 0) return null;

  return (
    <nav aria-label="Secciones" className="border-t border-papel-3">
      <div className="contenedor">
        <ul
          ref={refLista}
          className="-mx-1 flex items-center gap-1 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {secciones.map((s) => (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                data-seccion={s.id}
                aria-current={activa === s.id ? "true" : undefined}
                className={`block whitespace-nowrap px-4 py-3 text-[1.05rem] transition-colors ${
                  activa === s.id
                    ? "text-verde underline decoration-salvia decoration-2 underline-offset-[10px]"
                    : "text-tinta-tenue hover:text-verde"
                }`}
              >
                {s.texto}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
