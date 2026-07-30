# Fotos de Tatiana

Poné acá las fotos que quieras usar en el sitio. Se sirven directo por URL:
un archivo `retrato.jpg` en esta carpeta queda disponible como `/tati/retrato.jpg`.

**Por qué acá y no en `app/`:** en Next.js cada carpeta dentro de `app/` es una
dirección de la web, no un lugar de donde se sirvan archivos. Las imágenes van
en `public/`.

## Cómo usarlas

**Para la foto de «Hola, soy Tatiana»** hay dos caminos y conviene el segundo:

1. Ponerla acá y cargar la ruta (`/tati/retrato.jpg`) en la clave
   `sobre_foto_path` de `site_settings`. Requiere tocar la base.
2. **Subirla desde el panel** (Panel → Tu foto y las preguntas). Es lo que puede
   hacer Tati sola, sin que intervenga nadie más. Recomendado.

El sitio soporta las dos: si la ruta empieza con `/` la busca acá, y si no, en
Supabase Storage.

## Qué foto conviene

Vertical (más alta que ancha, idealmente 3:4), con ella sola y la cara bien
visible. Una foto en su consultorio o dando un taller funciona mejor que un
retrato de estudio: transmite a qué se dedica.

> Ojo: este repositorio es **público**. Todo lo que pongas acá queda publicado en
> GitHub y su historial. No pongas fotos de los chicos ni nada que no quieras que
> sea público para siempre.
