# Documentos para la clienta

Dos documentos, mismo diseño:

- `tati-mercadopago.html` — los códigos para poder cobrar.
- `tati-editar-la-web.html` — cómo usar el panel, para cuando ya tiene permisos.

El HTML es la fuente de cada uno; el PDF se genera desde ahí.

Para regenerarlo después de editar el HTML:

```bash
google-chrome --headless=new --disable-gpu --no-sandbox --no-pdf-header-footer \
  --print-to-pdf=docs/tati-mercadopago.pdf \
  "file://$PWD/docs/tati-mercadopago.html"
```

Los dos comparten el mismo bloque de CSS, copiado. Si se toca el diseño de uno,
conviene copiarlo al otro para que no se despeguen.

Dos cosas del diseño que conviene no romper:

- **`print-color-adjust: exact`** en `html`. Sin eso, Chrome descarta los fondos
  de color al imprimir y el documento sale en blanco y negro.
- **La portada no sangra hasta el borde del papel.** Chrome recorta contra el
  área de `@page`, así que el panel verde llena el alto útil (262mm en A4) y el
  margen blanco queda como marco. Los márgenes negativos no funcionan acá.

- **Sin saltos de página forzados.** Poner `page-break-before` en cada sección
  dejaba cuatro hojas con dos líneas. El texto fluye y lo único que se protege
  es que un título no se separe de lo que introduce (`page-break-after: avoid`)
  y que un recuadro no se corte al medio (`page-break-inside: avoid`).
