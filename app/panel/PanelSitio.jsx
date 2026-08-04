"use client";

import Image from "next/image";
import { useState } from "react";
import { Aviso, Boton, Campo, CampoArchivo, CampoLargo } from "@/app/components/Campos";
import { getSupabase } from "@/lib/supabaseClient";
import { useTextos } from "@/app/context/TextosProvider";
import { mensajeDeError } from "@/lib/errores";
import { urlPublica } from "@/lib/utils";

/**
 * Lo que no se puede editar haciendo click en la página:
 *
 *   · la foto de "Sobre mí"     — es un archivo, no un texto
 *   · las preguntas frecuentes  — viven en un acordeón, donde el editor
 *                                 inline queda incómodo
 *   · el WhatsApp y el Instagram — no son texto de pantalla sino los datos
 *                                 con que se arman los enlaces, y aparecen
 *                                 en varios lugares a la vez
 *
 * Todo el resto del sitio se edita haciendo click sobre el texto, con
 * "Editar la página" activado.
 */

const PREGUNTAS = [1, 2, 3, 4, 5, 6];

// Se guarda sólo el número, sin +, sin espacios y sin guiones: es lo que
// espera la API de wa.me. Si Tati pega "+54 223 447-4674" lo limpiamos acá en
// vez de hacerla pelear con el formato.
function soloDigitos(texto) {
  return String(texto ?? "").replace(/\D/g, "");
}

export default function PanelSitio() {
  const { obtener, guardar } = useTextos();

  const [foto, setFoto] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [guardandoFaq, setGuardandoFaq] = useState(false);
  const [guardandoContacto, setGuardandoContacto] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);

  const fotoActual = urlPublica(obtener("sobre_foto_path", ""));

  // Sólo se guardan en estado las claves que la editora TOCÓ; el resto se lee
  // siempre de la fuente. Así no hace falta un efecto que sincronice el
  // formulario cuando los textos terminan de cargar, y no hay dos fuentes de
  // verdad que puedan quedar desfasadas.
  const [ediciones, setEdiciones] = useState({});
  const valor = (clave) => ediciones[clave] ?? obtener(clave, "");

  const faq = PREGUNTAS.map((n) => ({
    n,
    p: valor(`faq_${n}_p`),
    r: valor(`faq_${n}_r`),
  }));

  async function subirFoto() {
    setError(null);
    setOk(null);

    if (!foto) {
      setError("Elegí una imagen primero.");
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return setError("El sitio todavía no está configurado.");

    setSubiendo(true);
    try {
      const ext = (foto.name.split(".").pop() ?? "jpg").toLowerCase();
      // Nombre fijo: cada foto nueva pisa la anterior y no se acumulan
      // archivos huérfanos en el bucket.
      const ruta = `retratos/sobre-mi.${ext}`;

      const { error: errSubida } = await supabase.storage
        .from("publico")
        .upload(ruta, foto, { upsert: true, contentType: foto.type });
      if (errSubida) throw errSubida;

      const { error: errTexto } = await guardar("sobre_foto_path", ruta);
      if (errTexto) throw new Error(errTexto);

      setFoto(null);
      setOk("Foto actualizada. Puede tardar unos minutos en verse en la web.");
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setSubiendo(false);
    }
  }

  async function guardarFaq() {
    setError(null);
    setOk(null);
    setGuardandoFaq(true);

    try {
      for (const fila of faq) {
        const { error: e1 } = await guardar(`faq_${fila.n}_p`, fila.p);
        if (e1) throw new Error(e1);
        const { error: e2 } = await guardar(`faq_${fila.n}_r`, fila.r);
        if (e2) throw new Error(e2);
      }
      setOk("Preguntas guardadas. Pueden tardar unos minutos en verse en la web.");
      setEdiciones({});
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardandoFaq(false);
    }
  }

  function cambiar(n, campo, nuevoValor) {
    setEdiciones((prev) => ({ ...prev, [`faq_${n}_${campo}`]: nuevoValor }));
  }

  function cambiarClave(clave, nuevoValor) {
    setEdiciones((prev) => ({ ...prev, [clave]: nuevoValor }));
  }

  async function guardarContacto() {
    setError(null);
    setOk(null);

    const numero = soloDigitos(valor("contacto_whatsapp"));
    if (numero.length < 10) {
      setError(
        "El WhatsApp parece incompleto. Va con el código de país y el de área, por ejemplo 5492234474674.",
      );
      return;
    }

    setGuardandoContacto(true);
    try {
      const arroba = valor("contacto_instagram").trim().replace(/^@/, "");
      for (const [clave, v] of [
        ["contacto_whatsapp", numero],
        ["contacto_instagram", arroba],
      ]) {
        const { error: e } = await guardar(clave, v);
        if (e) throw new Error(e);
      }
      setOk("Datos de contacto guardados. Pueden tardar unos minutos en verse en la web.");
      // Se olvidan sólo estas dos: el resto del formulario (las FAQ) puede
      // tener ediciones sin guardar y no hay que pisarlas.
      setEdiciones((prev) =>
        Object.fromEntries(
          Object.entries(prev).filter(
            ([clave]) => !clave.startsWith("contacto_"),
          ),
        ),
      );
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardandoContacto(false);
    }
  }

  return (
    <div className="grid gap-14 lg:grid-cols-[minmax(0,420px)_1fr]">
      {/* ------------------------------------------------------------- Foto */}
      <section>
        <h2 className="text-[1.5rem] text-tinta">Tu foto</h2>
        <p className="mt-2 leading-relaxed text-tinta-suave">
          Es la que aparece al lado de «Hola, soy Tatiana», en la página de
          inicio y en «Sobre mí».
        </p>

        {fotoActual ? (
          <div className="mt-6">
            <p className="versalitas text-tinta-tenue">Foto actual</p>
            <div className="relative mt-3 aspect-[3/4] w-full max-w-[220px] overflow-hidden rounded-[3px] ring-1 ring-tinta/10">
              <Image
                src={fotoActual}
                alt="Foto actual"
                fill
                sizes="220px"
                className="object-cover"
              />
            </div>
          </div>
        ) : (
          <p className="mt-6 rounded-[2px] border border-tostado-tenue bg-papel-2 px-5 py-4 text-tinta-suave">
            Todavía no hay ninguna. Mientras tanto la web muestra un ornamento en
            su lugar.
          </p>
        )}

        <div className="mt-6 space-y-5">
          <CampoArchivo
            id="foto_sobre_mi"
            etiqueta="Subir una foto nueva"
            acepta="image/png,image/jpeg,image/webp"
            alElegir={setFoto}
            ayuda="Vertical (más alta que ancha) queda mejor: la proporción ideal es 3 de ancho por 4 de alto. Máximo 10 MB. La foto nueva reemplaza a la anterior."
          />

          <Aviso tipo="error">{error}</Aviso>
          <Aviso tipo="ok">{ok}</Aviso>

          <Boton onClick={subirFoto} disabled={subiendo || !foto}>
            {subiendo ? "Subiendo…" : "Guardar la foto"}
          </Boton>
        </div>

        {/* ------------------------------------------------------- Contacto */}
        <h2 className="mt-16 text-[1.5rem] text-tinta">Tus datos de contacto</h2>
        <p className="mt-2 leading-relaxed text-tinta-suave">
          Con esto se arman los botones de WhatsApp e Instagram, que aparecen en
          la sección «Hablemos», en los talleres y en el pie de la página. Si los
          cambiás acá, cambian en todos lados.
        </p>

        <div className="mt-6 space-y-5">
          <Campo
            id="contacto_whatsapp"
            etiqueta="WhatsApp"
            valor={valor("contacto_whatsapp")}
            alCambiar={(v) => cambiarClave("contacto_whatsapp", v)}
            ayuda="Con código de país y de área, sin el + ni espacios: 5492234474674. Si lo pegás con espacios o guiones, se limpia solo al guardar."
          />
          <Campo
            id="contacto_instagram"
            etiqueta="Instagram"
            valor={valor("contacto_instagram")}
            alCambiar={(v) => cambiarClave("contacto_instagram", v)}
            ayuda="Sólo el nombre de usuario, sin el arroba: cisur.mdp"
          />

          <Boton onClick={guardarContacto} disabled={guardandoContacto}>
            {guardandoContacto ? "Guardando…" : "Guardar los datos de contacto"}
          </Boton>
        </div>
      </section>

      {/* -------------------------------------------------------------- FAQ */}
      <section>
        <h2 className="text-[1.5rem] text-tinta">Preguntas frecuentes</h2>
        <p className="mt-2 leading-relaxed text-tinta-suave">
          Aparecen al final de la página de inicio y en la página de cada
          material. Si dejás una pregunta vacía, igual se muestra el texto por
          defecto.
        </p>

        <div className="mt-8 space-y-8">
          {faq.map((fila) => (
            <div
              key={fila.n}
              className="rounded-[3px] border border-papel-3 bg-papel-2 p-6"
            >
              <p className="versalitas text-verde-claro">Pregunta {fila.n}</p>
              <div className="mt-4 space-y-4">
                <Campo
                  id={`faq_${fila.n}_p`}
                  etiqueta="La pregunta"
                  valor={fila.p}
                  alCambiar={(v) => cambiar(fila.n, "p", v)}
                />
                <CampoLargo
                  id={`faq_${fila.n}_r`}
                  etiqueta="La respuesta"
                  filas={4}
                  valor={fila.r}
                  alCambiar={(v) => cambiar(fila.n, "r", v)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <Boton onClick={guardarFaq} disabled={guardandoFaq}>
            {guardandoFaq ? "Guardando…" : "Guardar las preguntas"}
          </Boton>
        </div>
      </section>
    </div>
  );
}
