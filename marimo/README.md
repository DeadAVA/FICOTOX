# Presentación de avance de FICOTOX (marimo)

Presentación breve (12 diapositivas) para el laboratorio LN-FICOTOX: qué hace hoy la
plataforma, qué sigue y qué decisiones necesitamos. Está hecha en
[marimo](https://marimo.io) y es independiente de la aplicación Next.js.

| Archivo | Qué es |
| --- | --- |
| `presentacion_ficotox.py` | El cuaderno: una celda por diapositiva (las dos primeras, ocultas, tienen utilidades y el contenido del selector de roles). |
| `layouts/presentacion_ficotox.slides.json` | Layout de diapositivas (tipo de cada celda: `skip` o `slide`). |
| `presentacion.css` | Colores (océano `#0F7A95`), encabezado común y tarjetas. |
| `assets/` | Capturas de la plataforma (base de demostración, 1440×900). |
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
la derecha. La diapositiva 4 tiene un selector de rol y las 11 y 12 tienen pestañas.

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
- Las preguntas de las diapositivas 11 y 12 se escriben como `(pregunta, "cómo funciona hoy")`.
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
(una por rol), que funcionan en el navegador; las pestañas de preguntas también. Se
necesita conexión a internet para cargar los componentes de marimo al abrirlo.

Si prefiere una exportación sin el script, `marimo export html` a secas también sirve,
pero abre como documento vertical y el selector de roles no cambia de rol.

## Capturas

Se tomaron con Playwright a 1440×900, con la base de demostración (caso de ejemplo
R 0000001 / IR 0000001) y la sesión de la Responsable General de ejemplo. No muestran
contraseñas ni datos personales reales. Para renovarlas, levante la aplicación
(`npx next dev -p 3000`) y vuelva a tomar `inicio.png`, `recepcion.png`, `informe.png`,
`auditoria.png` y `roles.png` al mismo tamaño.
