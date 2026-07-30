/** @type {import('next').NextConfig} */

// El host de Supabase, para whitelistear las imágenes del bucket público.
const hostSupabase = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return null;
  }
})();

/**
 * Security headers.
 *
 * Deliberadamente sin CSP estricta: el lector de PDF necesita blob: y
 * worker-src, y una CSP mal calibrada rompe el lector en silencio — justo lo
 * que no podemos permitirnos en un sitio que nadie va a mantener. Los headers
 * de abajo cubren los vectores que sí importan acá (clickjacking, MIME
 * sniffing, fuga de referer).
 */
const cabeceras = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    remotePatterns: hostSupabase
      ? [
          {
            protocol: "https",
            hostname: hostSupabase,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },

  /**
   * El sitio pasó a ser una sola página con secciones. Estas URLs existieron
   * y pueden estar en un mensaje de WhatsApp, en un posteo o indexadas: en vez
   * de un 404, llevan al ancla correspondiente.
   */
  async redirects() {
    return [
      { source: "/guias", destination: "/", permanent: true },
      {
        source: "/guias/:slug",
        destination: "/#:slug",
        permanent: true,
      },
      { source: "/talleres", destination: "/#talleres", permanent: true },
      { source: "/sobre-mi", destination: "/#sobre-mi", permanent: true },
    ];
  },

  async headers() {
    return [
      { source: "/(.*)", headers: cabeceras },
      {
        // Que nada cachee una respuesta que contiene una URL firmada.
        source: "/api/leer/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, private" }],
      },
    ];
  },
};

export default nextConfig;
