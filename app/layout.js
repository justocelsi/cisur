import "./globals.css";
import Encabezado from "./components/Encabezado";
import PieDePagina from "./components/PieDePagina";
import Proveedores from "./components/Proveedores";
import { getTextos } from "@/lib/datos";
import { urlSitio } from "@/lib/utils";

const SITIO = urlSitio();

const DESCRIPCION =
  "Materiales y talleres de alfabetización para familias, por la Lic. Tatiana Galera, psicopedagoga. Cómo acompañar a tus hijos en la lectura y la escritura desde casa.";

export const metadata = {
  metadataBase: new URL(SITIO),
  title: {
    default: "CISUR — Alfabetización para familias | Lic. Tatiana Galera",
    template: "%s · CISUR",
  },
  description: DESCRIPCION,
  applicationName: "CISUR",
  authors: [{ name: "Tatiana Galera" }],
  creator: "Tatiana Galera",
  keywords: [
    "alfabetización",
    "psicopedagogía",
    "familias",
    "aprender a leer",
    "aprender a escribir",
    "etapas de la escritura",
    "conciencia fonológica",
    "Mar del Plata",
    "guía para familias",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: SITIO,
    siteName: "CISUR — Centro Integral Sur",
    title: "CISUR — Alfabetización para familias",
    description: DESCRIPCION,
  },
  twitter: {
    card: "summary_large_image",
    title: "CISUR — Alfabetización para familias",
    description: DESCRIPCION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  formatDetection: { telephone: false },
};

export const viewport = {
  themeColor: "#faf7f1",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }) {
  // Los textos se cargan una sola vez acá y bajan al cliente ya renderizados.
  const textosIniciales = await getTextos();

  return (
    <html lang="es-AR">
      <body className="flex min-h-screen flex-col">
        <Proveedores textosIniciales={textosIniciales}>
          <a
            href="#contenido"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[2px] focus:bg-verde focus:px-4 focus:py-2 focus:text-papel"
          >
            Saltar al contenido
          </a>
          <Encabezado />
          <main id="contenido" className="flex-1">
            {children}
          </main>
          <PieDePagina />
        </Proveedores>
      </body>
    </html>
  );
}
