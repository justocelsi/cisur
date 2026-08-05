#!/usr/bin/env python3
"""
Achica un PDF sin tocar un solo píxel, y demuestra que no lo tocó.

    python3 -m venv /tmp/venv && /tmp/venv/bin/pip install pymupdf
    /tmp/venv/bin/python scripts/aligerar-pdf.py material.pdf material-liviano.pdf

PyMuPDF no es dependencia del proyecto: esto se corre a mano cuando entra un
material nuevo, no en cada build.

POR QUÉ EXISTE
El primer material del sitio pesaba 13,2 MB y tardaba 26 segundos en abrir.
Al mirarlo adentro, 9,2 MB eran la MISMA imagen de 939 KB guardada once veces,
una por página: el exportador no la reusó. Deduplicarla lo dejó en 4,3 MB y
5 segundos. Ni un píxel distinto.

QUÉ HACE Y QUÉ NO
Hace: fusiona objetos idénticos, recomprime los streams y limpia lo que no se
usa. Todo reorganización, no recodificación.

NO hace: bajar resolución ni pasar imágenes a JPEG. Se probó y se descartó —
`rewrite_images()` de PyMuPDF rompió las referencias a los XObjects pequeños y
un emoji desapareció de todas las páginas, en silencio, mientras el archivo
"mejoraba" de 4,1 a 0,9 MB. El tamaño bajaba porque faltaba contenido.

De ahí la verificación final: se renderiza cada página de los dos archivos y se
comparan los píxeles. Si alguna difiere, el script falla y no te deja usar la
salida. Un PDF que pesa menos porque perdió contenido es peor que uno pesado.
"""

import hashlib
import os
import sys

try:
    import fitz  # PyMuPDF
except ImportError:
    sys.exit("Falta PyMuPDF:  pip install pymupdf")

PPP_VERIFICACION = 150  # Por encima de la resolución típica de las imágenes.


def aligerar(entrada, salida):
    doc = fitz.open(entrada)
    doc.save(
        salida,
        garbage=4,        # fusiona objetos duplicados
        deflate=True,
        deflate_images=True,
        deflate_fonts=True,
        clean=True,
    )
    doc.close()


def paginas_identicas(a_ruta, b_ruta):
    """Renderiza las dos y compara píxeles. Devuelve la lista de páginas que difieren."""
    a, b = fitz.open(a_ruta), fitz.open(b_ruta)
    try:
        if a.page_count != b.page_count:
            return [f"cantidad de páginas: {a.page_count} contra {b.page_count}"]
        distintas = []
        for i in range(a.page_count):
            ha = hashlib.sha256(a[i].get_pixmap(dpi=PPP_VERIFICACION).samples).hexdigest()
            hb = hashlib.sha256(b[i].get_pixmap(dpi=PPP_VERIFICACION).samples).hexdigest()
            if ha != hb:
                distintas.append(i + 1)
        return distintas
    finally:
        a.close()
        b.close()


def main():
    if len(sys.argv) != 3:
        sys.exit(f"uso: {sys.argv[0]} entrada.pdf salida.pdf")

    entrada, salida = sys.argv[1], sys.argv[2]
    if not os.path.exists(entrada):
        sys.exit(f"No encontré {entrada}")

    antes = os.path.getsize(entrada)
    aligerar(entrada, salida)
    despues = os.path.getsize(salida)

    print(f"  {antes/1048576:.1f} MB → {despues/1048576:.1f} MB"
          f"   ({100 * (1 - despues / antes):.0f}% menos)")

    distintas = paginas_identicas(entrada, salida)
    if distintas:
        os.remove(salida)
        sys.exit(f"\n  LA SALIDA NO ES IDÉNTICA (páginas {distintas}).\n"
                 f"  La borré. No subas un material que perdió contenido.\n")

    doc = fitz.open(salida)
    n = doc.page_count
    doc.close()
    print(f"  {n} páginas verificadas a {PPP_VERIFICACION} ppp: idénticas.")


if __name__ == "__main__":
    main()
