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

## `tati-cobrar-antes`

Documento corto, aparte de los otros dos, para las dos configuraciones que
quedaron pendientes en la cuenta de Mercado Pago de Tati: **el plazo de
acreditación** (su plata tardaba 18 días) y **las notificaciones de venta** (no
le llegaban los avisos al celular).

Va aparte a propósito. Los otros dos documentos son de puesta en marcha y ya
los leyó; éste es una tarea concreta de diez minutos, y mezclarla adentro de un
PDF de ocho páginas que ya conoce es la mejor forma de que no se haga.

Lleva los números reales de su primera venta —$18.000, comisión $774,53,
disponible el 23 de agosto— porque un ejemplo con sus propios números explica el
costo de esperar mejor que cualquier porcentaje.

**Los porcentajes de comisión NO se fijan en el documento**, en ninguno de los
tres. Mercado Pago los cambia varias veces al año y nadie va a estar para
regenerar el PDF: se explica dónde verlos en pantalla y se da el orden de
magnitud sobre su precio real.
