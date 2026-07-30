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
import { formatearPrecio, slugify } from "@/lib/utils";

const VACIO = {
  titulo: "",
  subtitulo: "",
  descripcion: "",
  autor: "Lic. Tatiana Galera",
  precio: "",
  precio_lista: "",
  paginas: "",
  indiceTexto: "",
  activo: false,
  destacado: false,
};

export default function PanelProductos() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [portada, setPortada] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [progreso, setProgreso] = useState(null);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);

  // La carga vive dentro del efecto y se re-dispara subiendo `recarga`. Así
  // hay un solo camino de lectura, con cancelación al desmontar.
  const [recarga, setRecarga] = useState(0);
  const recargar = () => setRecarga((n) => n + 1);

  useEffect(() => {
    let vivo = true;

    async function correr() {
      const supabase = getSupabase();

      const { data, error: err } = supabase
        ? await supabase
            .from("productos")
            .select("*")
            .order("orden", { ascending: true })
            .order("created_at", { ascending: true })
        : { data: null, error: new Error("sin configurar") };

      if (!vivo) return;
      if (err) setError(mensajeDeError(err));
      setProductos(data ?? []);
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
    setPortada(null);
    setPdf(null);
    setError(null);
    setOk(null);
    setProgreso(null);
  }

  function editar(producto) {
    setEditandoId(producto.id);
    setForm({
      titulo: producto.titulo ?? "",
      subtitulo: producto.subtitulo ?? "",
      descripcion: producto.descripcion ?? "",
      autor: producto.autor ?? "",
      precio: producto.precio ?? "",
      precio_lista: producto.precio_lista ?? "",
      paginas: producto.paginas ?? "",
      indiceTexto: Array.isArray(producto.indice)
        ? producto.indice.join("\n")
        : "",
      activo: producto.activo,
      destacado: producto.destacado,
    });
    setPortada(null);
    setPdf(null);
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
    if (form.precio === "" || Number(form.precio) < 0) {
      setError("Poné un precio válido (puede ser 0 si es gratis).");
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return setError("El sitio todavía no está configurado.");

    setGuardando(true);

    const fila = {
      titulo: form.titulo.trim(),
      subtitulo: form.subtitulo.trim() || null,
      descripcion: form.descripcion.trim() || null,
      autor: form.autor.trim() || null,
      precio: Number(form.precio),
      precio_lista:
        form.precio_lista === "" ? null : Number(form.precio_lista),
      paginas: form.paginas === "" ? null : Number(form.paginas),
      indice: form.indiceTexto
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
      activo: form.activo,
      destacado: form.destacado,
    };

    try {
      let id = editandoId;

      if (id) {
        setProgreso("Guardando los datos…");
        const { error: err } = await supabase
          .from("productos")
          .update(fila)
          .eq("id", id);
        if (err) throw err;
      } else {
        setProgreso("Creando el material…");
        // El slug se deriva del título; si choca, le agregamos un sufijo.
        let slug = slugify(fila.titulo) || "material";
        const { data: existente } = await supabase
          .from("productos")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (existente) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

        const { data, error: err } = await supabase
          .from("productos")
          .insert({ ...fila, slug })
          .select("id")
          .single();
        if (err) throw err;
        id = data.id;
      }

      // --- Portada (bucket público) ---
      if (portada) {
        setProgreso("Subiendo la portada…");
        const ext = (portada.name.split(".").pop() ?? "jpg").toLowerCase();
        const ruta = `portadas/${id}.${ext}`;
        const { error: errSubida } = await supabase.storage
          .from("publico")
          .upload(ruta, portada, { upsert: true, contentType: portada.type });
        if (errSubida) throw errSubida;

        const { error: errPath } = await supabase
          .from("productos")
          .update({ portada_path: ruta })
          .eq("id", id);
        if (errPath) throw errPath;
      }

      // --- PDF (bucket privado) ---
      // La convención de path <producto_id>/archivo.pdf es la que usa la
      // policy de Storage para decidir quién puede leerlo. No cambiarla.
      if (pdf) {
        setProgreso("Subiendo el PDF… (puede tardar un rato)");
        const ruta = `${id}/material.pdf`;
        const { error: errSubida } = await supabase.storage
          .from("guias")
          .upload(ruta, pdf, { upsert: true, contentType: "application/pdf" });
        if (errSubida) throw errSubida;

        const { error: errPath } = await supabase
          .from("productos")
          .update({ archivo_path: ruta })
          .eq("id", id);
        if (errPath) throw errPath;
      }

      setProgreso(null);
      setGuardando(false);
      setOk(
        editandoId
          ? "Cambios guardados. Pueden tardar unos minutos en verse en la web."
          : "Material creado. Pueden tardar unos minutos en verse en la web.",
      );
      limpiar();
      recargar();
    } catch (e) {
      setProgreso(null);
      setGuardando(false);
      setError(mensajeDeError(e));
    }
  }

  async function alternarActivo(producto) {
    const supabase = getSupabase();
    if (!supabase) return;
    const { error: err } = await supabase
      .from("productos")
      .update({ activo: !producto.activo })
      .eq("id", producto.id);
    if (err) setError(mensajeDeError(err));
    recargar();
  }

  return (
    <div className="grid gap-14 lg:grid-cols-[minmax(0,420px)_1fr]">
      {/* ---------------------------------------------------------- Formulario */}
      <section>
        <h2 className="text-[1.5rem] text-tinta">
          {editandoId ? "Editar material" : "Nuevo material"}
        </h2>

        <div className="mt-6 space-y-5">
          <Campo
            id="titulo"
            etiqueta="Título"
            requerido
            valor={form.titulo}
            alCambiar={(v) => setForm({ ...form, titulo: v })}
            ayuda="El nombre del material, como querés que se lea en la web."
          />

          <Campo
            id="subtitulo"
            etiqueta="Bajada"
            valor={form.subtitulo}
            alCambiar={(v) => setForm({ ...form, subtitulo: v })}
            ayuda="Una línea corta arriba del título. Por ejemplo: «Una guía para familias»."
          />

          <CampoLargo
            id="descripcion"
            etiqueta="Descripción"
            filas={5}
            valor={form.descripcion}
            alCambiar={(v) => setForm({ ...form, descripcion: v })}
            ayuda="De qué trata. Es lo que lee alguien que está decidiendo si comprarlo."
          />

          <Campo
            id="autor"
            etiqueta="Autora"
            valor={form.autor}
            alCambiar={(v) => setForm({ ...form, autor: v })}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Campo
              id="precio"
              etiqueta="Precio"
              tipo="number"
              min="0"
              step="100"
              requerido
              valor={form.precio}
              alCambiar={(v) => setForm({ ...form, precio: v })}
              ayuda="En pesos, sin puntos ni signos. Ej: 19900"
            />
            <Campo
              id="precio_lista"
              etiqueta="Precio tachado"
              tipo="number"
              min="0"
              step="100"
              valor={form.precio_lista}
              alCambiar={(v) => setForm({ ...form, precio_lista: v })}
              ayuda="Opcional. Si lo llenás, se muestra tachado al lado del precio."
            />
          </div>

          <Campo
            id="paginas"
            etiqueta="Cantidad de páginas"
            tipo="number"
            min="1"
            valor={form.paginas}
            alCambiar={(v) => setForm({ ...form, paginas: v })}
            ayuda="Opcional."
          />

          <CampoLargo
            id="indice"
            etiqueta="Índice"
            filas={7}
            valor={form.indiceTexto}
            alCambiar={(v) => setForm({ ...form, indiceTexto: v })}
            ayuda="Un capítulo por línea. Se muestra numerado en la página del material."
          />

          <CampoArchivo
            id="portada"
            etiqueta="Portada"
            acepta="image/png,image/jpeg,image/webp"
            alElegir={setPortada}
            ayuda="Imagen vertical (proporción 3:4 queda perfecta). Máximo 10 MB. Si no subís ninguna, se dibuja una tapa tipográfica automática."
          />

          <CampoArchivo
            id="pdf"
            etiqueta="El PDF del material"
            acepta="application/pdf"
            alElegir={setPdf}
            ayuda="Sólo PDF, máximo 100 MB. Este archivo queda privado: sólo lo puede leer quien lo compró."
          />

          <CampoSiNo
            id="activo"
            etiqueta="Publicado"
            valor={form.activo}
            alCambiar={(v) => setForm({ ...form, activo: v })}
            ayuda="Si está destildado, nadie lo ve ni lo puede comprar. Dejalo destildado hasta que hayas subido el PDF."
          />

          <CampoSiNo
            id="destacado"
            etiqueta="Destacado en la página de inicio"
            valor={form.destacado}
            alCambiar={(v) => setForm({ ...form, destacado: v })}
            ayuda="El material que protagoniza la portada del sitio. Marcá sólo uno."
          />

          <Aviso tipo="error">{error}</Aviso>
          <Aviso tipo="ok">{ok}</Aviso>
          <Aviso tipo="info">{progreso}</Aviso>

          <div className="flex flex-wrap gap-3 pt-2">
            <Boton onClick={guardar} disabled={guardando}>
              {guardando
                ? "Guardando…"
                : editandoId
                  ? "Guardar cambios"
                  : "Crear material"}
            </Boton>
            {editandoId ? (
              <Boton variante="secundario" onClick={limpiar} disabled={guardando}>
                Cancelar
              </Boton>
            ) : null}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- Listado */}
      <section>
        <h2 className="text-[1.5rem] text-tinta">Materiales cargados</h2>

        {cargando ? (
          <p className="mt-6 text-tinta-tenue">Cargando…</p>
        ) : productos.length === 0 ? (
          <p className="mt-6 rounded-[2px] border border-tostado-tenue bg-papel-2 px-5 py-4 text-tinta-suave">
            Todavía no hay ninguno. Creá el primero con el formulario.
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {productos.map((p) => (
              <li
                key={p.id}
                className="rounded-[3px] border border-papel-3 bg-papel-2 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-[1.27rem] leading-snug text-tinta">
                      {p.titulo}
                    </h3>
                    <p className="mt-1 text-[1.05rem] text-tinta-tenue">
                      {formatearPrecio(p.precio)}
                      {p.destacado ? " · destacado" : ""}
                      {" · /guias/"}
                      {p.slug}
                    </p>
                    <p className="mt-2 flex flex-wrap gap-3 text-[0.95rem]">
                      <span
                        className={
                          p.activo ? "text-verde" : "text-tinta-tenue"
                        }
                      >
                        {p.activo ? "● Publicado" : "○ Borrador"}
                      </span>
                      <span
                        className={
                          p.archivo_path ? "text-verde" : "text-alerta"
                        }
                      >
                        {p.archivo_path ? "● PDF cargado" : "○ Falta el PDF"}
                      </span>
                      <span
                        className={
                          p.portada_path ? "text-verde" : "text-tinta-tenue"
                        }
                      >
                        {p.portada_path ? "● Con portada" : "○ Tapa automática"}
                      </span>
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Boton variante="secundario" onClick={() => editar(p)}>
                      Editar
                    </Boton>
                    <Boton
                      variante="secundario"
                      onClick={() => alternarActivo(p)}
                    >
                      {p.activo ? "Despublicar" : "Publicar"}
                    </Boton>
                  </div>
                </div>

                {p.activo && !p.archivo_path ? (
                  <p className="mt-4 rounded-[2px] border border-alerta/30 bg-alerta/5 px-4 py-2.5 text-[0.95rem] text-alerta">
                    Está publicado pero no tiene PDF: si alguien lo compra, no va
                    a poder leerlo. Subí el archivo o despublicalo.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
