"use client";

import { useEffect, useRef, useState } from "react";
import { useTextos } from "@/app/context/TextosProvider";
import { useModoEdicion } from "@/app/context/ModoEdicionProvider";

/**
 * Un texto del sitio que Tati puede editar haciendo click.
 *
 * Fuera del modo edición es exactamente el elemento que le pases (`como`),
 * sin markup extra ni JS de más: lo que ve Google es el texto pelado.
 *
 *   <TextoEditable clave="hero_titulo" como="h1" className="..." >
 *     Título por defecto
 *   </TextoEditable>
 *
 * El children hace de fallback: si la base todavía no tiene esa clave (o si
 * Supabase no está configurado) se muestra igual y el sitio no se rompe.
 */
export default function TextoEditable({
  clave,
  como: Como = "span",
  children,
  className = "",
  multilinea = false,
  ...resto
}) {
  const { obtener, guardar } = useTextos();
  const { editando } = useModoEdicion();

  const fallback = typeof children === "string" ? children : "";
  const valor = obtener(clave, fallback);

  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState(valor);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const refCampo = useRef(null);

  // El borrador se siembra al abrir el editor, en el handler del click, no en
  // un efecto que observe `abierto`: así no hay un render intermedio con el
  // textarea mostrando el valor viejo.
  function abrir() {
    setBorrador(valor);
    setError(null);
    setAbierto(true);
  }

  useEffect(() => {
    if (abierto && refCampo.current) {
      refCampo.current.focus();
      refCampo.current.select?.();
    }
  }, [abierto]);

  if (!editando) {
    return (
      <Como className={className} {...resto}>
        {valor}
      </Como>
    );
  }

  async function confirmar() {
    setGuardando(true);
    const { error: err } = await guardar(clave, borrador);
    setGuardando(false);
    if (err) {
      setError(err);
      return;
    }
    setAbierto(false);
  }

  function alTeclado(evento) {
    if (evento.key === "Escape") {
      evento.preventDefault();
      setAbierto(false);
    }
    // En una sola línea, Enter confirma. En multilínea hace falta Ctrl+Enter
    // para no impedir los saltos de párrafo.
    if (evento.key === "Enter" && (!multilinea || evento.ctrlKey || evento.metaKey)) {
      evento.preventDefault();
      confirmar();
    }
  }

  if (abierto) {
    const Campo = multilinea ? "textarea" : "input";
    return (
      <span className="block">
        <Campo
          ref={refCampo}
          value={borrador}
          onChange={(e) => setBorrador(e.target.value)}
          onKeyDown={alTeclado}
          rows={multilinea ? 6 : undefined}
          className="w-full rounded-[2px] border border-verde bg-white px-3 py-2 font-serif text-[1.1rem] leading-relaxed text-tinta shadow-sm"
          aria-label={`Editar ${clave}`}
        />
        <span className="mt-2 flex flex-wrap items-center gap-2 text-[0.95rem]">
          <button
            type="button"
            onClick={confirmar}
            disabled={guardando}
            className="rounded-[2px] bg-verde px-3 py-1 text-papel disabled:opacity-60"
          >
            {guardando ? "Guardando…" : "Guardar"}
          </button>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="rounded-[2px] border border-papel-3 px-3 py-1 text-tinta-suave"
          >
            Cancelar
          </button>
          <span className="text-tinta-tenue">
            {multilinea ? "Ctrl+Enter guarda · Esc cancela" : "Enter guarda · Esc cancela"}
          </span>
        </span>
        {error ? (
          <span className="mt-1 block text-[0.95rem] text-alerta">{error}</span>
        ) : null}
      </span>
    );
  }

  return (
    <Como
      className={`${className} cursor-pointer rounded-[2px] outline-1 outline-offset-4 outline-dashed outline-salvia hover:bg-salvia-tenue/40`}
      onClick={abrir}
      title="Click para editar"
      {...resto}
    >
      {valor}
      <span aria-hidden="true" className="ml-1 align-super text-[0.85rem] text-verde-claro">
        ✎
      </span>
    </Como>
  );
}
