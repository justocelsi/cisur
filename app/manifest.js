export default function manifest() {
  return {
    name: "CISUR — Centro Integral Sur",
    short_name: "CISUR",
    description:
      "Materiales y talleres de alfabetización para familias, por la Lic. Tatiana Galera.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f1",
    theme_color: "#41664a",
    lang: "es-AR",
    icons: [
      {
        src: "/logo-cisur.jpg",
        sizes: "564x564",
        type: "image/jpeg",
      },
    ],
  };
}
