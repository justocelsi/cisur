"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import NavSecciones from "./NavSecciones";
import { useAuth } from "@/app/context/AuthProvider";
import { useModoEdicion } from "@/app/context/ModoEdicionProvider";

/**
 * Encabezado de dos filas, pegado arriba.
 *
 *   fila 1 — logo + cuenta (ingresar / mis materiales / panel / editar)
 *   fila 2 — el nav de secciones del one-pager
 *
 * Las dos filas viven dentro del mismo contenedor pegajoso: así no hay que
 * calcular a mano el desfase de la segunda respecto de la primera, que es de
 * donde salen los headers que se pisan entre sí al hacer scroll.
 *
 * La fila 2 sólo aparece en la portada: en el lector o en el panel no hay
 * secciones a las que saltar.
 */
export default function Encabezado({ secciones = [] }) {
  const ruta = usePathname();
  const { autenticado, esEditor, salir, profile } = useAuth();
  const { editando, puedeEditar, alternar } = useModoEdicion();
  const [abierto, setAbierto] = useState(false);

  const cerrar = () => setAbierto(false);
  const enPortada = ruta === "/";

  /**
   * Publica el alto real del encabezado en --alto-encabezado.
   *
   * De ahí sale la compensación de scroll de las anclas (utilidad `ancla`) y
   * la línea de detección del nav. Se mide en vez de hardcodearse porque el
   * alto cambia entre mobile y escritorio, y cambiaría de nuevo si el logo o
   * el nav crecen. Un número mágico acá es un título tapado más adelante.
   */
  const refEncabezado = useRef(null);
  useEffect(() => {
    const nodo = refEncabezado.current;
    if (!nodo) return;

    function medir() {
      document.documentElement.style.setProperty(
        "--alto-encabezado",
        `${nodo.offsetHeight}px`,
      );
    }

    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  return (
    <header
      ref={refEncabezado}
      className="no-imprimir sticky top-0 z-40 bg-papel/95 backdrop-blur-sm"
    >
      <div className="border-b border-papel-3">
        <div className="contenedor flex items-center justify-between gap-4 py-3">
          <Link href="/" className="shrink-0" aria-label="CISUR — inicio">
            <Logo />
          </Link>

          {/* Cuenta — escritorio */}
          <div className="hidden items-center gap-4 md:flex">
            {puedeEditar ? (
              <button
                type="button"
                onClick={alternar}
                aria-pressed={editando}
                className={`rounded-[2px] border px-3 py-1.5 text-[1.05rem] transition-colors ${
                  editando
                    ? "border-verde bg-verde text-papel"
                    : "border-papel-3 text-tinta-suave hover:border-salvia"
                }`}
              >
                {editando ? "Terminar de editar" : "Editar la página"}
              </button>
            ) : null}

            {esEditor ? (
              <Link
                href="/panel"
                className="text-[1.05rem] text-tinta-suave hover:text-verde"
              >
                Panel
              </Link>
            ) : null}

            {autenticado ? (
              <>
                <Link
                  href="/mis-materiales"
                  className="text-[1.05rem] text-tinta-suave hover:text-verde"
                >
                  Mis materiales
                </Link>
                <button
                  type="button"
                  onClick={salir}
                  className="text-[1.05rem] text-tinta-tenue hover:text-alerta"
                >
                  Salir
                </button>
              </>
            ) : (
              <Link
                href="/ingresar"
                className="rounded-[2px] border border-verde px-4 py-1.5 text-[1.05rem] text-verde transition-colors hover:bg-verde hover:text-papel"
              >
                Ingresar
              </Link>
            )}
          </div>

          {/* Cuenta — mobile */}
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            aria-controls="menu-cuenta"
            aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
            className="flex h-10 w-10 items-center justify-center rounded-[2px] border border-papel-3 text-verde md:hidden"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              {abierto ? "✕" : "☰"}
            </span>
          </button>
        </div>
      </div>

      {/* Fila 2: las secciones del one-pager */}
      {enPortada ? <NavSecciones secciones={secciones} /> : null}

      {/* Menú de cuenta desplegado en mobile */}
      {abierto ? (
        <div
          id="menu-cuenta"
          className="border-t border-papel-3 bg-papel md:hidden"
        >
          <div className="contenedor flex flex-col py-2">
            {autenticado ? (
              <>
                <Link
                  href="/mis-materiales"
                  onClick={cerrar}
                  className="border-b border-papel-2 py-3 text-tinta-suave"
                >
                  Mis materiales
                </Link>
                {esEditor ? (
                  <Link
                    href="/panel"
                    onClick={cerrar}
                    className="border-b border-papel-2 py-3 text-tinta-suave"
                  >
                    Panel
                  </Link>
                ) : null}
                {puedeEditar ? (
                  <button
                    type="button"
                    onClick={() => {
                      alternar();
                      cerrar();
                    }}
                    aria-pressed={editando}
                    className="border-b border-papel-2 py-3 text-left text-tinta-suave"
                  >
                    {editando ? "Terminar de editar" : "Editar la página"}
                  </button>
                ) : null}
                <span className="py-3 text-[1.05rem] text-tinta-tenue">
                  {profile?.nombre || profile?.email}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    salir();
                    cerrar();
                  }}
                  className="py-3 text-left text-alerta"
                >
                  Salir
                </button>
              </>
            ) : (
              <Link href="/ingresar" onClick={cerrar} className="py-3 text-verde">
                Ingresar
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
