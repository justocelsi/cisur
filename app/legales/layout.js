import Link from "next/link";

const PAGINAS = [
  { href: "/legales/terminos", texto: "Términos y condiciones" },
  { href: "/legales/privacidad", texto: "Privacidad" },
  { href: "/legales/reembolsos", texto: "Cambios y reembolsos" },
  { href: "/legales/arrepentimiento", texto: "Botón de arrepentimiento" },
];

export default function LayoutLegales({ children }) {
  return (
    <div className="contenedor py-16 md:py-24">
      <div className="grid gap-14 md:grid-cols-[220px_1fr] md:gap-20">
        <nav aria-label="Información legal" className="md:sticky md:top-28 md:self-start">
          <h2 className="versalitas text-tinta-tenue">Legales</h2>
          <ul className="mt-5 space-y-3 text-[1.02rem]">
            {PAGINAS.map((p) => (
              <li key={p.href}>
                <Link href={p.href} className="text-tinta-suave hover:text-verde">
                  {p.texto}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="prosa text-tinta-suave">{children}</div>
      </div>
    </div>
  );
}
