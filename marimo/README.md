# Presentación de avance de FICOTOX (marimo)

Presentación breve (9 diapositivas) para el laboratorio LN-FICOTOX: qué hace hoy la
plataforma y qué sigue. Está hecha en
[marimo](https://marimo.io) y es independiente de la aplicación Next.js.

| Archivo | Qué es |
| --- | --- |
| `presentacion_ficotox.py` | El cuaderno: una celda por diapositiva (las dos primeras, ocultas, tienen utilidades y el contenido del selector de roles). |
| `layouts/presentacion_ficotox.slides.json` | Layout de diapositivas (tipo de cada celda: `skip` o `slide`). |
| `presentacion.css` | Colores (océano `#0F7A95`), encabezado común y tarjetas. |
| `assets/` | Capturas de la plataforma (base de demostración, recortadas y a doble resolución). |
| `presentacion_ficotox.html` | Versión HTML estática para compartir (se abre en el navegador). |
| `exportar_html.py` | Genera el HTML estático en modo diapositivas. |
| `requirements.txt` | Versión de marimo con la que se hizo (0.23.8). |

## Requisitos

marimo 0.23.8 (Python 3.10 o superior). Si no está instalado, use un entorno propio de
esta carpeta para no tocar nada global:

```bash
python3 -m venv marimo/.venv
marimo/.venv/bin/pip install -r marimo/requirements.txt
# y use marimo/.venv/bin/marimo en lugar de marimo
```

## Abrirla (modo presentación)

Desde la raíz del repositorio:

```bash
marimo run marimo/presentacion_ficotox.py
```

Se abre en el navegador en modo diapositivas, con el código oculto. Avance con las
flechas ← → (o los botones de la esquina); el botón de pantalla completa está arriba a
la derecha. La diapositiva 4 tiene un selector de rol.

Diapositivas: 1 portada · 2 ¿qué es y qué base sigue? · 3 flujo de una muestra ·
4 roles · 5 controles · 6 informes · 7 documentos, inventario y equipos · 8 trazabilidad
y auditoría · 9 siguientes pasos.

**Ampliar una captura:** haga clic en la imagen (o en el botón ⤢ de su esquina) y se
muestra en grande sobre la diapositiva; otro clic en cualquier parte la cierra. Funciona
igual en `marimo run` y en el HTML exportado, porque no usa JavaScript (es un
`<details>` con CSS). Limitaciones: la imagen ampliada ocupa el área de la diapositiva,
no toda la pantalla (use el botón de pantalla completa para verla más grande), y se
cierra con clic, no con la tecla Esc.

## Editarla

```bash
marimo edit marimo/presentacion_ficotox.py
```

- Cada diapositiva es una celda; el texto está en la propia celda.
- El encabezado común se arma con `encabezado(n, "Título", "Sección")` y el folio con el
  total `TOTAL` de la primera celda. Si agrega o quita una diapositiva, ajuste `TOTAL`, los
  números de `encabezado(...)` y el arreglo `cells` del layout (una entrada por celda, en
  orden).
- El contenido de "Puede / No puede" de cada rol está en el diccionario `ROLES` (segunda
  celda); sale de `MANUAL_USUARIO.md` (13.18) y `docs/CATALOGO_PERMISOS.md`.
- Las capturas se insertan con `captura("archivo.png", "pie")`: la imagen ocupa todo el
  ancho de su columna sin pasar del alto de la pantalla (conserva su proporción) y se
  amplía con un clic. Las diapositivas con imagen usan dos columnas: texto breve a la
  izquierda y la captura (60–70 % del ancho) a la derecha.
- En el editor, la vista de diapositivas se elige con el botón de layout (arriba a la
  derecha); desde ahí se puede cambiar el tipo de cada celda y el layout se guarda solo.

Después de editar, verifique:

```bash
marimo check marimo/presentacion_ficotox.py
```

## Exportarla

HTML estático para compartir (un solo archivo; las capturas van incrustadas):

```bash
python marimo/exportar_html.py
```

Ese script ejecuta

```bash
marimo export html --no-include-code -f marimo/presentacion_ficotox.py -o marimo/presentacion_ficotox.html -- --estatico
```

y agrega una línea al HTML para que abra directamente en modo diapositivas (sin ella,
marimo muestra el HTML estático como documento vertical; también se puede abrir
agregando `?view-as=slides` a la dirección). El HTML no tiene Python detrás: por eso,
con `--estatico`, el selector de roles de la diapositiva 4 se muestra como pestañas
(una por rol), que funcionan en el navegador. Las capturas van incrustadas y también se
amplían con un clic. Se necesita conexión a internet para cargar los componentes de marimo al abrirlo.

Si prefiere una exportación sin el script, `marimo export html` a secas también sirve,
pero abre como documento vertical y el selector de roles no cambia de rol.

## Capturas

Se tomaron con Playwright (`deviceScaleFactor` 2, para que se vean nítidas) con la base
de demostración (caso de ejemplo R 0000001 / IR 0000001) y la sesión de la Responsable
General de ejemplo, recortadas a la zona que importa y sin la barra lateral:

| Archivo | Ruta y recorte |
| --- | --- |
| `inicio.png` | `/` a 1200×800: saludo, buscador, «En curso» y «Avisos». |
| `recepcion.png` | `/muestras/recepcion/1` a 1200×800: cabecera, índice de secciones y datos de la recepción. |
| `informe.png` | `/informes/1` a 1440×900: cabecera del informe + firmas (revisó, autorizó, liberó) + panel «Envíos por correo» (se unen dos recortes). |
| `auditoria.png` | `/auditoria` a 1280×820, con la anulación de R 0000002 abierta: lista y panel de detalle. |
| `roles.png` | `/administracion/roles`, rol Coordinador/a del Área Técnica abierto: matriz de permisos. |

No muestran contraseñas ni datos personales reales. Para renovarlas, levante la
aplicación (`npx next dev -p 3000`), tome las mismas zonas a doble resolución y
reemplace los archivos; la presentación ajusta el tamaño sola a partir de la proporción
de cada imagen.
