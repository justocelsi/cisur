# Documentos para la clienta

`tati-mercadopago.html` es la fuente; el PDF se genera desde ahí.

Para regenerarlo después de editar el HTML:

```bash
google-chrome --headless=new --disable-gpu --no-sandbox --no-pdf-header-footer \
  --print-to-pdf=docs/tati-mercadopago.pdf \
  "file://$PWD/docs/tati-mercadopago.html"
```

Dos cosas del diseño que conviene no romper:

- **`print-color-adjust: exact`** en `html`. Sin eso, Chrome descarta los fondos
  de color al imprimir y el documento sale en blanco y negro.
- **La portada no sangra hasta el borde del papel.** Chrome recorta contra el
  área de `@page`, así que el panel verde llena el alto útil (262mm en A4) y el
  margen blanco queda como marco. Los márgenes negativos no funcionan acá.
