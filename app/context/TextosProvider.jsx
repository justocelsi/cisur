"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { getSupabase } from "@/lib/supabaseClient";
import { useAuth } from "./AuthProvider";
import { mensajeDeError } from "@/lib/errores";

/**
 * Textos editables del sitio.
 *
 * Los valores iniciales llegan desde el servidor (ya renderizados en el HTML,
 * así que el SEO no depende de JavaScript). Este provider sólo existe para que
 * Tati pueda editarlos en vivo: guarda en la base y actualiza la copia local
 * para que el cambio se vea al instante, sin recargar.
 */

const TextosContext = createContext(null);

export function TextosProvider({ children, textosIniciales = {} }) {
  const [textos, setTextos] = useState(textosIniciales);
  const { esEditor } = useAuth();

  const obtener = useCallback(
    (clave, fallback = "") => {
      const valor = textos?.[clave];
      if (valor === null || valor === undefined || valor === "") return fallback;
      return valor;
    },
    [textos],
  );

  const guardar = useCallback(
    async (clave, valor) => {
      const supabase = getSupabase();
      if (!supabase) return { error: "El sitio todavía no está configurado." };
      if (!esEditor) return { error: "No tenés permiso para editar." };

      const anterior = textos[clave];

      // Optimista: la UI responde antes de que vuelva la base.
      setTextos((prev) => ({ ...prev, [clave]: valor }));

      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: clave, value: valor, updated_at: new Date().toISOString() });

      if (error) {
        setTextos((prev) => ({ ...prev, [clave]: anterior }));
        return { error: mensajeDeError(error) };
      }

      return { error: null };
    },
    [esEditor, textos],
  );

  const valor = useMemo(
    () => ({ textos, obtener, guardar }),
    [textos, obtener, guardar],
  );

  return (
    <TextosContext.Provider value={valor}>{children}</TextosContext.Provider>
  );
}

export function useTextos() {
  const ctx = useContext(TextosContext);
  if (!ctx) throw new Error("useTextos tiene que usarse dentro de <TextosProvider>");
  return ctx;
}
