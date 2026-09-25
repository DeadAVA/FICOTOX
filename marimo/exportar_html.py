"""Exporta la presentación a un HTML estático que abre en modo diapositivas.

Uso (desde la raíz del repositorio):

    python marimo/exportar_html.py

1. Ejecuta `marimo export html` sin código y con `-- --estatico` (en esa versión el
   selector de roles se muestra como pestañas, que funcionan sin Python detrás).
2. Agrega al HTML una línea que abre la vista de diapositivas (`?view-as=slides`);
   sin ella, el HTML estático de marimo se muestra como documento vertical. También
   oculta el aviso "Static notebook", porque las pestañas sí funcionan sin Python.
"""

import shutil
import subprocess
import sys
from pathlib import Path

CARPETA = Path(__file__).resolve().parent
CUADERNO = CARPETA / "presentacion_ficotox.py"
SALIDA = CARPETA / "presentacion_ficotox.html"
MARCA = "<!-- fx-vista-diapositivas -->"
SCRIPT = (
    MARCA
    + "<script>(function(){try{var u=new URL(location.href);"
    + 'if(!u.searchParams.has("view-as")){u.searchParams.set("view-as","slides");'
    + 'history.replaceState(null,"",u.toString());}}catch(e){}})();</script>'
    # Oculta el aviso "Static notebook": aquí las pestañas sí funcionan sin Python.
    + '<style>ol[class*="z-100"][class*="max-h-screen"] > li { display: none !important; }</style>'
)


def main() -> int:
    marimo = shutil.which("marimo") or str(Path(sys.executable).parent / "marimo")
    subprocess.run(
        [marimo, "export", "html", "--no-include-code", "-f", str(CUADERNO), "-o", str(SALIDA), "--", "--estatico"],
        check=True,
    )
    html = SALIDA.read_text(encoding="utf-8")
    if MARCA not in html:
        html = html.replace("<head>", "<head>" + SCRIPT, 1)
        SALIDA.write_text(html, encoding="utf-8")
    print(f"Listo: {SALIDA}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
