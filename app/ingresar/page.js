import { Suspense } from "react";
import FormularioIngreso from "./FormularioIngreso";

export const metadata = {
  title: "Ingresar",
  description: "Entrá a tu cuenta para leer los materiales que compraste.",
  robots: { index: false, follow: false },
};

export default function Ingresar() {
  return (
    <div className="contenedor-angosto py-16 md:py-24">
      <Suspense
        fallback={
          <p className="text-center text-tinta-tenue">Cargando…</p>
        }
      >
        <FormularioIngreso />
      </Suspense>
    </div>
  );
}
