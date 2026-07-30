-- ============================================================================
-- CISUR — 0006_seed.sql
-- Textos iniciales del sitio y los dos productos.
--
-- Todo lo de acá es editable después por Tati desde el modo edición, así que
-- estos valores son sólo el punto de partida. El copy sale de sus propios
-- documentos (TEXTO.docx y la guía de alfabetización).
-- ============================================================================

insert into site_settings (key, value) values

  -- Hero ---------------------------------------------------------------------
  ('hero_kicker',
   'Guía para familias'),
  ('hero_titulo',
   'El rol de la familia en el proceso de alfabetización'),
  ('hero_texto',
   'Una guía práctica para entender cómo aprenden a leer y escribir tus hijos, y cómo acompañarlos desde casa con confianza, sin presiones y sin convertirte en su maestra.'),
  ('hero_cta',
   'Quiero la guía'),
  ('hero_firma',
   'Lic. Tatiana Galera · Psicopedagoga · Mat. Prov. 205281'),

  -- Sección "¿te suena?" -----------------------------------------------------
  ('dolor_titulo',
   '¿Alguna de estas preguntas te resulta familiar?'),
  ('dolor_1', '¿Lo estaré ayudando bien?'),
  ('dolor_2', '¿Debería practicar más en casa?'),
  ('dolor_3', '¿Es normal que escriba así?'),
  ('dolor_4', '¿Tengo que corregirle los errores?'),
  ('dolor_cierre',
   'Detrás de estas preguntas hay mucho amor y muchas ganas de acompañar. También, muchas veces, la sensación de no saber por dónde empezar. Esta guía es para eso.'),

  -- Sobre mí (de TEXTO.docx, versión abreviada) -----------------------------
  ('sobre_titulo',
   'Hola, soy Tatiana'),
  ('sobre_p1',
   'Desde muy chica supe que quería dedicarme a la educación. Crecí entre jardines, juegos y canciones gracias a mi mamá, que es docente. Admiraba a mis maestras y soñaba con algún día ocupar ese lugar.'),
  ('sobre_p2',
   'Ese sueño me llevó a estudiar el Profesorado de Nivel Inicial y, con el tiempo, la Licenciatura en Psicopedagogía. En 2020, mientras esperaba a mi primera hija, me recibí en plena pandemia. Después llegaron nuevos desafíos: los equipos de orientación escolar y acompañar el crecimiento de una institución maternal desde un rol directivo.'),
  ('sobre_p3',
   'Durante años recibí familias con la misma preocupación: "¿cómo puedo ayudar a mi hijo en casa?". Ahí entendí que hacía falta un espacio para acompañar también a las familias, no sólo a los chicos. Por eso nació CISUR.'),

  -- Talleres ----------------------------------------------------------------
  ('talleres_titulo',
   'Talleres para colegios e instituciones'),
  ('talleres_texto',
   'Encuentros presenciales con familias y equipos docentes sobre alfabetización, conciencia fonológica, juego y lectura compartida. Se arman a medida de cada institución.'),
  ('talleres_cta',
   'Consultar por un taller'),

  -- Cómo funciona la compra (se muestra una vez, vale para todo el catálogo) --
  ('compra_detalle_1', 'Acceso inmediato después del pago'),
  ('compra_detalle_2', 'Lectura online desde celular, tablet o computadora'),
  ('compra_detalle_3', 'Sin vencimiento: la leés cuando quieras'),
  ('compra_detalle_4', 'Escrita por una psicopedagoga matriculada'),

  -- FAQ ---------------------------------------------------------------------
  ('faq_1_p', '¿Para qué edades sirve?'),
  ('faq_1_r', 'Está pensada para familias con chicos que están construyendo la lectura y la escritura: aproximadamente desde los 4 hasta los 8 años. Los capítulos sobre lenguaje oral y vínculo con la lectura sirven incluso antes.'),
  ('faq_2_p', '¿Reemplaza a la escuela o a un tratamiento?'),
  ('faq_2_r', 'No. La guía es material de orientación para acompañar desde casa. No reemplaza la enseñanza sistemática de la escuela ni una evaluación psicopedagógica cuando hace falta. El capítulo 7 justamente te ayuda a reconocer cuándo conviene consultar.'),
  ('faq_3_p', '¿Cómo la recibo?'),
  ('faq_3_r', 'No hay archivo que se pueda perder. Después de pagar, la guía queda disponible en tu cuenta, en la sección "Mis materiales", y la leés online cuando quieras.'),
  ('faq_4_p', '¿Puedo descargarla o imprimirla?'),
  ('faq_4_r', 'La lectura es online. Es material protegido por derecho de autor y la compra habilita el uso personal, así que no incluye descarga ni reventa.'),
  ('faq_5_p', '¿Necesito saber de tecnología?'),
  ('faq_5_r', 'No. Te registrás con tu mail, pagás con Mercado Pago como en cualquier compra online y la guía aparece en tu cuenta.'),
  ('faq_6_p', '¿Tengo dudas después de leerla?'),
  ('faq_6_r', 'Podés escribirme por WhatsApp o Instagram. También trabajo con familias en consultorio y armo talleres para colegios.'),

  -- Contacto ----------------------------------------------------------------
  ('contacto_whatsapp',  '542234474674'),
  ('contacto_instagram', 'cisur.mdp'),
  ('contacto_ciudad',    'Mar del Plata, Buenos Aires'),
  ('contacto_titulo',    'Hablemos'),
  ('contacto_texto',     'Consultas por la guía, turnos en consultorio o talleres para tu institución.')

on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- El producto. El PDF y la portada se suben después desde el panel; el precio
-- arranca en un valor de referencia y Tati lo ajusta cuando quiera.
-- ---------------------------------------------------------------------------
insert into productos (
  slug, titulo, nombre_corto, subtitulo, descripcion, autor,
  precio, precio_lista, paginas, destacado, activo, orden,
  portada_path, indice_titulo, indice
) values

  -- 1. La guía ---------------------------------------------------------------
  (
    'rol-de-la-familia-alfabetizacion',
    'El rol de la familia en el proceso de alfabetización',
    'La guía',
    'Una guía para familias',
    'Siete capítulos para entender cómo aprenden a leer y escribir los chicos, reconocer las etapas de la escritura y acompañar el proceso desde casa con confianza, respeto y disfrute. Incluye propuestas de reflexión al final de cada capítulo.',
    'Lic. Tatiana Galera',
    25000, 34900, null, true, true, 0,
    null,
    'Índice',
    '[
      "¿Qué significa alfabetizar?",
      "El rol de la familia: acompañar sin reemplazar",
      "¿Cómo aprenden a escribir los niños y las niñas?",
      "Las etapas de la escritura: comprender para acompañar",
      "Observar para comprender: reconocer el momento de aprendizaje",
      "Cómo acompañar la alfabetización en casa",
      "¿Cuándo consultar con un profesional?"
    ]'::jsonb
  ),

  -- 2. El frasco de las invitaciones ------------------------------------------
  -- La portada empieza apuntando a un archivo del repo (public/productos/…).
  -- Si Tati sube otra desde el panel, pasa a apuntar a Supabase Storage.
  (
    'frasco-de-invitaciones',
    'El frasco de las invitaciones',
    'El frasco',
    'Juego educativo para toda la familia',
    '¿Sabías que el juego es una de las mejores herramientas para la alfabetización? El frasco de las invitaciones son 50 propuestas para disfrutar en familia, compartir tiempo de calidad y descubrir que la alfabetización puede estar presente en los momentos más simples. Cada una fue pensada para que la lectura, la escritura, la conversación y el juego aparezcan de manera natural, respetando los tiempos, intereses y posibilidades de cada familia.',
    'Lic. Tatiana Galera',
    18000, null, null, false, true, 1,
    '/productos/frasco-de-invitaciones.webp',
    'Algunas invitaciones',
    '[
      "Preparar una receta",
      "Salir a caminar",
      "Leer un cuento",
      "Escribir un mensaje",
      "Inventar una historia"
    ]'::jsonb
  )

on conflict (slug) do nothing;
