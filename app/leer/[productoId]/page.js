import Lector from "./Lector";

export const metadata = {
  title: "Lector",
  robots: { index: false, follow: false, nocache: true },
};

export default async function PaginaLector({ params }) {
  const { productoId } = await params;
  return <Lector productoId={productoId} />;
}
