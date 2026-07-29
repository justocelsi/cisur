"use client";

import { AuthProvider } from "@/app/context/AuthProvider";
import { ModoEdicionProvider } from "@/app/context/ModoEdicionProvider";
import { TextosProvider } from "@/app/context/TextosProvider";

/**
 * Único punto donde se anidan los providers.
 *
 * El orden importa: Textos y ModoEdicion consultan useAuth para saber si el
 * usuario es editor, así que AuthProvider tiene que envolverlos.
 *
 * `textosIniciales` viene del servidor: los textos ya están en el HTML antes
 * de que corra un solo byte de JavaScript.
 */
export default function Proveedores({ children, textosIniciales }) {
  return (
    <AuthProvider>
      <ModoEdicionProvider>
        <TextosProvider textosIniciales={textosIniciales}>
          {children}
        </TextosProvider>
      </ModoEdicionProvider>
    </AuthProvider>
  );
}
