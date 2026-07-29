import { notFound } from "next/navigation";
import { Suspense } from "react";
import ResultadoPago from "./ResultadoPago";

const ESTADOS = ["exito", "pendiente", "error"];

export const metadata = {
  title: "Resultado del pago",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return ESTADOS.map((estado) => ({ estado }));
}

export default async function PaginaPago({ params }) {
  const { estado } = await params;
  if (!ESTADOS.includes(estado)) notFound();

  return (
    <div className="contenedor-angosto py-20 md:py-28">
      <Suspense
        fallback={<p className="text-center text-tinta-tenue">Cargando…</p>}
      >
        <ResultadoPago estado={estado} />
      </Suspense>
    </div>
  );
}
