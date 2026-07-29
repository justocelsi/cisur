import NuevaClave from "./NuevaClave";

export const metadata = {
  title: "Nueva contraseña",
  robots: { index: false, follow: false },
};

export default function Pagina() {
  return (
    <div className="contenedor-angosto py-16 md:py-24">
      <NuevaClave />
    </div>
  );
}
