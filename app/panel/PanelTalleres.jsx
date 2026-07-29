"use client";

import { useEffect, useState } from "react";
import {
  Aviso,
  Boton,
  Campo,
  CampoArchivo,
  CampoLargo,
  CampoSiNo,
} from "@/app/components/Campos";
import { getSupabase } from "@/lib/supabaseClient";
import { mensajeDeError } from "@/lib/errores";
import { formatearFecha } from "@/lib/utils";

const VACIO = {
  titulo: "",
  descripcion: "",
  lugar: "",
  fecha: "",
  visible: true,
};

export default function PanelTalleres() {
  const [talleres, setTalleres] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [imagen, setImagen] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);

  const [recarga, setRecarga] = useState(0);
  const recargar = () => setRecarga((n) => n + 1);

  useEffect(() => {
    let vivo = true;

    async function correr() {
      const supabase = getSupabase();

      const { data, error: err } = supabase
        ? await supabase
            .from("talleres")
            .select("*")
            .order("orden", { ascending: true })
            .order("fecha", { ascending: false, nullsFirst: false })
        : { data: null, error: new Error("sin configurar") };

      if (!vivo) return;
      if (err) setError(mensajeDeError(err));
      setTalleres(data ?? []);
      setCargando(false);
    }

    correr();
    return () => {
      vivo = false;
    };
  }, [recarga]);

  function limpiar() {
    setEditandoId(null);
    setForm(VACIO);
    setImagen(null);
    setError(null);
    setOk(null);
  }

  function editar(taller) {
    setEditandoId(taller.id);
    setForm({
      titulo: taller.titulo ?? "",
      descripcion: taller.descripcion ?? "",
      lugar: taller.lugar ?? "",
      fecha: taller.fecha ?? "",
      visible: taller.visible,
    });
    setImagen(null);
    setError(null);
    setOk(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardar() {
    setError(null);
    setOk(null);

    if (!form.titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return setError("El sitio todavía no está configurado.");

    setGuardando(true);

    const fila = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || null,
      lugar: form.lugar.trim() || null,
      fecha: form.fecha || null,
      visible: form.visible,
    };

    try {
      let id = editandoId;

      if (id) {
        const { error: err } = await supabase
          .from("talleres")
          .update(fila)
          .eq("id", id);
        if (err) throw err;
      } else {
        const { data, error: err } = await supabase
          .from("talleres")
          .insert(fila)
          .select("id")
          .single();
        if (err) throw err;
        id = data.id;
      }

      if (imagen) {
        const ext = (imagen.name.split(".").pop() ?? "jpg").toLowerCase();
        const ruta = `talleres/${id}.${ext}`;
        const { error: errSubida } = await supabase.storage
          .from("publico")
          .upload(ruta, imagen, { upsert: true, contentType: imagen.type });
        if (errSubida) throw errSubida;

        const { error: errPath } = await supabase
          .from("talleres")
          .update({ imagen_path: ruta })
          .eq("id", id);
        if (errPath) throw errPath;
      }

      setGuardando(false);
      setOk("Guardado. Puede tardar unos minutos en verse en la web.");
      limpiar();
      recargar();
    } catch (e) {
      setGuardando(false);
      setError(mensajeDeError(e));
    }
  }

  async function borrar(taller) {
    // Un taller es puramente informativo: borrarlo no afecta ninguna venta,
    // así que acá sí se puede eliminar de verdad.
    if (
      !window.confirm(
        `¿Seguro que querés borrar «${taller.titulo}»? No se puede deshacer.`,
      )
    ) {
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    const { error: err } = await supabase
      .from("talleres")
      .delete()
      .eq("id", taller.id);

    if (err) setError(mensajeDeError(err));
    recargar();
  }

  return (
    <div className="grid gap-14 lg:grid-cols-[minmax(0,420px)_1fr]">
      <section>
        <h2 className="text-[1.4rem] text-tinta">
          {editandoId ? "Editar taller" : "Nuevo taller"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-tinta-suave">
          Los talleres no se venden por la web: se muestran para dar prueba de tu
          trabajo, y quien se interesa te escribe por WhatsApp.
        </p>

        <div className="mt-6 space-y-5">
          <Campo
            id="t_titulo"
            etiqueta="Título"
            requerido
            valor={form.titulo}
            alCambiar={(v) => setForm({ ...form, titulo: v })}
            ayuda="Por ejemplo: «Taller de alfabetización para familias»."
          />

          <Campo
            id="t_lugar"
            etiqueta="Dónde"
            valor={form.lugar}
            alCambiar={(v) => setForm({ ...form, lugar: v })}
            ayuda="El colegio o la institución. Por ejemplo: «Colegio Colinas»."
          />

          <Campo
            id="t_fecha"
            etiqueta="Cuándo"
            tipo="date"
            valor={form.fecha}
            alCambiar={(v) => setForm({ ...form, fecha: v })}
            ayuda="Opcional."
          />

          <CampoLargo
            id="t_descripcion"
            etiqueta="Descripción"
            filas={4}
            valor={form.descripcion}
            alCambiar={(v) => setForm({ ...form, descripcion: v })}
            ayuda="Dos o tres líneas sobre qué se trabajó."
          />

          <CampoArchivo
            id="t_imagen"
            etiqueta="Foto"
            acepta="image/png,image/jpeg,image/webp"
            alElegir={setImagen}
            ayuda="Una foto del encuentro. Horizontal queda mejor. Máximo 10 MB."
          />

          <CampoSiNo
            id="t_visible"
            etiqueta="Visible en la web"
            valor={form.visible}
            alCambiar={(v) => setForm({ ...form, visible: v })}
          />

          <Aviso tipo="error">{error}</Aviso>
          <Aviso tipo="ok">{ok}</Aviso>

          <div className="flex flex-wrap gap-3 pt-2">
            <Boton onClick={guardar} disabled={guardando}>
              {guardando
                ? "Guardando…"
                : editandoId
                  ? "Guardar cambios"
                  : "Crear taller"}
            </Boton>
            {editandoId ? (
              <Boton variante="secundario" onClick={limpiar} disabled={guardando}>
                Cancelar
              </Boton>
            ) : null}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-[1.4rem] text-tinta">Talleres cargados</h2>

        {cargando ? (
          <p className="mt-6 text-tinta-tenue">Cargando…</p>
        ) : talleres.length === 0 ? (
          <p className="mt-6 rounded-[2px] border border-arena bg-papel-2 px-5 py-4 text-tinta-suave">
            Todavía no cargaste ninguno.
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {talleres.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-[3px] border border-papel-3 bg-papel-2 p-5"
              >
                <div className="min-w-0">
                  <h3 className="text-[1.1rem] leading-snug text-tinta">
                    {t.titulo}
                  </h3>
                  <p className="mt-1 text-sm text-tinta-tenue">
                    {[t.lugar, formatearFecha(t.fecha)].filter(Boolean).join(" · ") ||
                      "Sin lugar ni fecha"}
                  </p>
                  <p
                    className={`mt-2 text-xs ${
                      t.visible ? "text-verde" : "text-tinta-tenue"
                    }`}
                  >
                    {t.visible ? "● Visible" : "○ Oculto"}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Boton variante="secundario" onClick={() => editar(t)}>
                    Editar
                  </Boton>
                  <Boton variante="peligro" onClick={() => borrar(t)}>
                    Borrar
                  </Boton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
