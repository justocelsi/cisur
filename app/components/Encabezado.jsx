"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "./Logo";
import { useAuth } from "@/app/context/AuthProvider";
import { useModoEdicion } from "@/app/context/ModoEdicionProvider";

const ENLACES = [
  { href: "/", texto: "Inicio" },
  { href: "/guias", texto: "Materiales" },
  { href: "/talleres", texto: "Talleres" },
  { href: "/sobre-mi", texto: "Sobre mí" },
];

export default function Encabezado() {
  const ruta = usePathname();
  const { autenticado, esEditor, salir, profile } = useAuth();
  const { editando, puedeEditar, alternar } = useModoEdicion();
  const [abierto, setAbierto] = useState(false);

  // El menú mobile se cierra al tocar cualquier cosa que navegue. Se hace en
  // el handler y no en un efecto sobre la ruta: es el mismo resultado sin un
  // render extra, y no depende de que el pathname cambie (tocar el link de la
  // página actual también cierra).
  const cerrar = () => setAbierto(false);

  return (
    <header className="no-imprimir sticky top-0 z-40 border-b border-papel-3 bg-papel/95 backdrop-blur-sm">
      <div className="contenedor flex items-center justify-between gap-4 py-4">
        <Link href="/" className="shrink-0" aria-label="CISUR — inicio">
          <Logo />
        </Link>

        {/* Navegación de escritorio */}
        <nav className="hidden items-center gap-7 md:flex" aria-label="Principal">
          {ENLACES.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              aria-current={ruta === e.href ? "page" : undefined}
              className={`text-[1.02rem] transition-colors hover:text-verde ${
                ruta === e.href
                  ? "text-verde underline decoration-salvia decoration-1 underline-offset-[6px]"
                  : "text-tinta-suave"
              }`}
            >
              {e.texto}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {puedeEditar ? (
            <button
              type="button"
              onClick={alternar}
              aria-pressed={editando}
              className={`rounded-[2px] border px-3 py-1.5 text-[0.95rem] transition-colors ${
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
              className="text-[1.02rem] text-tinta-suave hover:text-verde"
            >
              Panel
            </Link>
          ) : null}

          {autenticado ? (
            <>
              <Link
                href="/mis-materiales"
                className="text-[1.02rem] text-tinta-suave hover:text-verde"
              >
                Mis materiales
              </Link>
              <button
                type="button"
                onClick={salir}
                className="text-[1.02rem] text-tinta-tenue hover:text-alerta"
              >
                Salir
              </button>
            </>
          ) : (
            <Link
              href="/ingresar"
              className="rounded-[2px] border border-verde px-4 py-1.5 text-[1.02rem] text-verde transition-colors hover:bg-verde hover:text-papel"
            >
              Ingresar
            </Link>
          )}
        </div>

        {/* Botón hamburguesa */}
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-controls="menu-mobile"
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          className="flex h-10 w-10 items-center justify-center rounded-[2px] border border-papel-3 text-verde md:hidden"
        >
          <span aria-hidden="true" className="text-[1.2rem] leading-none">
            {abierto ? "✕" : "☰"}
          </span>
        </button>
      </div>

      {/* Navegación mobile */}
      {abierto ? (
        <nav
          id="menu-mobile"
          aria-label="Principal"
          className="border-t border-papel-3 bg-papel md:hidden"
        >
          <div className="contenedor flex flex-col py-2">
            {ENLACES.map((e) => (
              <Link
                key={e.href}
                href={e.href}
                onClick={cerrar}
                aria-current={ruta === e.href ? "page" : undefined}
                className={`border-b border-papel-2 py-3 ${
                  ruta === e.href ? "text-verde" : "text-tinta-suave"
                }`}
              >
                {e.texto}
              </Link>
            ))}

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
                <span className="py-3 text-[0.95rem] text-tinta-tenue">
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
        </nav>
      ) : null}
    </header>
  );
}
