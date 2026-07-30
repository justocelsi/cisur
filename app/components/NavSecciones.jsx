"use client";

import { useEffect, useState } from "react";

/**
 * Nav de secciones del one-pager.
 *
 * Es la segunda fila del encabezado, que está pegado arriba. Resalta la
 * sección que se está mirando usando IntersectionObserver: es el navegador el
 * que avisa cuándo una sección entra en pantalla, así que no hay que escuchar
 * el evento de scroll (que dispara decenas de veces por segundo y hace que la
 * página se sienta pesada en el celular).
 *
 * En mobile las secciones no entran a lo ancho: la barra scrollea en
 * horizontal, que es lo esperable y no obliga a un menú desplegable más.
 */
export default function NavSecciones({ secciones = [] }) {
  const [activa, setActiva] = useState(null);

  useEffect(() => {
    if (secciones.length === 0) return;

    const nodos = secciones
      .map((s) => document.getElementById(s.id))
      .filter(Boolean);

    if (nodos.length === 0) return;

    const observador = new IntersectionObserver(
      (entradas) => {
        // Puede haber varias secciones visibles a la vez; gana la que esté más
        // arriba de las que cruzaron el umbral.
        const visibles = entradas
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visibles.length > 0) setActiva(visibles[0].target.id);
      },
      {
        // El margen de arriba descuenta la altura del encabezado y esta misma
        // barra; si no, una sección se marca activa cuando todavía está tapada.
        rootMargin: "-140px 0px -55% 0px",
        threshold: 0,
      },
    );

    nodos.forEach((n) => observador.observe(n));
    return () => observador.disconnect();
  }, [secciones]);

  if (secciones.length === 0) return null;

  return (
    <nav
      aria-label="Secciones"
      className="border-t border-papel-3"
    >
      <div className="contenedor">
        <ul className="-mx-1 flex items-center gap-1 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {secciones.map((s) => (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
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
