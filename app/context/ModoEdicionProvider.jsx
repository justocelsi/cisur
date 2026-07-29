"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";

/**
 * Toggle global del modo edición.
 *
 * Cuando está activo, cada texto editable muestra un lápiz y se puede cambiar
 * en el lugar. Es la forma más simple de darle autonomía a alguien sin
 * conocimiento técnico: no hay panel separado, no hay que buscar el campo en
 * un formulario, se hace click sobre lo que se quiere cambiar.
 */

const ModoEdicionContext = createContext(null);

export function ModoEdicionProvider({ children }) {
  const { esEditor } = useAuth();
  const [activo, setActivo] = useState(false);

  const alternar = useCallback(() => {
    setActivo((prev) => !prev);
  }, []);

  const valor = useMemo(
    () => ({
      // `editando` se DERIVA: exige el toggle prendido y el rol de editor.
      // Al desloguearse, esEditor pasa a false y el modo edición se apaga
      // solo, sin necesidad de un efecto que sincronice el estado.
      editando: activo && esEditor,
      puedeEditar: esEditor,
      alternar,
    }),
    [activo, esEditor, alternar],
  );

  return (
    <ModoEdicionContext.Provider value={valor}>
      {children}
    </ModoEdicionContext.Provider>
  );
}

export function useModoEdicion() {
  const ctx = useContext(ModoEdicionContext);
  if (!ctx) {
    throw new Error("useModoEdicion tiene que usarse dentro de <ModoEdicionProvider>");
  }
  return ctx;
}
