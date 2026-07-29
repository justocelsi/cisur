import MisMateriales from "./MisMateriales";

export const metadata = {
  title: "Mis materiales",
  description: "Los materiales que compraste, listos para leer.",
  robots: { index: false, follow: false },
};

export default function Pagina() {
  return (
    <div className="contenedor py-16 md:py-24">
      <MisMateriales />
    </div>
  );
}
