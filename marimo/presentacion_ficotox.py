import marimo

__generated_with = "0.23.8"
app = marimo.App(
    width="full",
    app_title="FICOTOX · Avance",
    css_file="presentacion.css",
    layout_file="layouts/presentacion_ficotox.slides.json",
)


@app.cell(hide_code=True)
def _():
    # Utilidades comunes (celda oculta en la presentación).
    from pathlib import Path

    import marimo as mo

    ASSETS = (mo.notebook_dir() or Path(__file__).parent) / "assets"
    TOTAL = 12

    def encabezado(n, titulo, seccion=""):
        """Encabezado común: sección, título y folio en monoespaciada."""
        return mo.Html(
            f'<div class="fx-head">'
            f'<div><div class="fx-kicker">{seccion}</div>'
            f'<h2 class="fx-title">{titulo}</h2></div>'
            f'<div class="fx-folio">{n:02d} / {TOTAL:02d}</div>'
            f"</div>"
        )

    def captura(nombre, ancho="100%", pie=None):
        return mo.image(
            ASSETS / nombre,
            alt=pie or nombre,
            width=ancho,
            rounded=True,
            caption=pie,
            style={"border": "1px solid #d7e3e7"},
        )

    def lista(items, clase="fx-list"):
        lis = "".join(f"<li>{i}</li>" for i in items)
        return mo.Html(f'<ul class="{clase}">{lis}</ul>')

    def pregunta(texto, hoy=None):
        hoy_html = f'<div class="fx-hoy">Hoy funciona así: {hoy}</div>' if hoy else ""
        return f'<div class="fx-q"><div class="fx-q-t">{texto}</div>{hoy_html}</div>'

    def preguntas(items):
        return mo.Html(
            '<div class="fx-qs">' + "".join(pregunta(*i) for i in items) + "</div>"
        )

    return captura, encabezado, lista, mo, preguntas


@app.cell(hide_code=True)
def _(mo):
    # Contenido del selector de roles (MANUAL_USUARIO.md 13.18 y docs/CATALOGO_PERMISOS.md).
    ROLES = {
        "Administrador técnico del sistema": {
            "puede": [
                "Dar de alta, dar de baja y bloquear cuentas",
                "Asignar y retirar roles (el alta de un rol la aprueba el Responsable General)",
                "Consultar la bitácora",
                "Ver el estado de las muestras, sin resultados",
            ],
            "no": [
                "Aprobar altas o cambios de acceso",
                "Otorgar autorizaciones FX-THF-AP",
                "Capturar, revisar o aprobar análisis e informes",
                "Aprobar documentos del SGC",
            ],
        },
        "Responsable General": {
            "puede": [
                "Aprobar altas y cambios de acceso",
                "Revisar, autorizar y liberar informes",
                "Aprobar documentos del SGC y su baja",
                "Anular con justificación en casos excepcionales",
                "Otorgar autorizaciones FX-THF-AP; consultar todo",
            ],
            "no": [
                "Capturar recepciones, análisis o informes",
                "Aprobar análisis (lo hace la Coord. Técnica)",
                "Administrar cuentas (lo hace el Administrador técnico)",
            ],
        },
        "Coordinador/a de Mejora Continua": {
            "puede": [
                "Aceptar propuestas y hacer la revisión de calidad de documentos",
                "Publicar y distribuir documentos; lista maestra",
                "Aprobar excepciones a la separación de funciones",
                "Consultar la bitácora completa y anular en calidad y documentos",
                "Otorgar autorizaciones FX-THF-AP",
            ],
            "no": [
                "Capturar recepciones, análisis o informes",
                "Aprobar un documento que ella misma revisó",
                "Aprobar cambios de acceso",
            ],
        },
        "Coordinador/a del Área Técnica": {
            "puede": [
                "Asignar muestras y hacer cualquier etapa técnica",
                "Revisar y aprobar resultados",
                "Revisar, autorizar y liberar informes",
                "Decidir rechazos, desviaciones, cambios de folio y reaperturas",
                "Administrar equipos e inventario; otorgar autorizaciones",
            ],
            "no": [
                "Revisar o aprobar su propio trabajo",
                "Aprobar documentos del SGC",
                "Administrar cuentas o aprobar accesos",
            ],
        },
        "Coordinador/a de Investigación y Desarrollo": {
            "puede": [
                "Capturar y revisar ensayos e informes",
                "Hacer la revisión técnica de documentos",
                "Registrar en equipos e inventario",
            ],
            "no": [
                "Aprobar análisis ni autorizar informes",
                "Administrar cuentas o aprobar accesos",
            ],
            "nota": "Sus funciones propias (proyectos de investigación) aún no existen: hoy no se limita a sus proyectos.",
        },
        "Técnico Analista": {
            "puede": [
                "Trabajar las muestras que le asignan",
                "Procesar, extraer, analizar y enviar a revisión",
                "Crear informes en borrador",
                "Registrar uso de equipos y movimientos de inventario",
            ],
            "no": [
                "Revisar o aprobar resultados",
                "Ver muestras que no le asignaron",
                "Consultar la bitácora",
            ],
        },
        "Técnico Auxiliar": {
            "puede": [
                "Registrar recepciones de muestras",
                "Registrar procesamientos",
                "Registrar uso de equipos y movimientos de inventario",
            ],
            "no": [
                "Extraer o analizar",
                "Ver informes",
                "Consultar la bitácora",
            ],
        },
        "Administrador/a Auxiliar": {
            "puede": [
                "Programar mantenimientos de equipos y sus reportes",
                "Registrar en inventario",
                "Ver el estado de las muestras, sin resultados",
            ],
            "no": [
                "Capturar o ver análisis e informes",
                "Consultar la bitácora",
            ],
            "nota": "Sus funciones propias (compras y proveedores) aún no existen.",
        },
        "Auditor Interno": {
            "puede": [
                "Consultar todo en solo lectura",
                "Consultar y exportar la bitácora",
            ],
            "no": [
                "Capturar, modificar o aprobar nada",
                "Tener además un rol técnico o de calidad",
            ],
            "nota": "Sus funciones propias (auditorías internas) aún no existen.",
        },
        "Estudiante / personal en formación": {
            "puede": [
                "Trabajar las muestras que le asignan, con supervisión",
                "Todo lo que captura espera el visto bueno de su supervisor",
                "Ver los documentos que le distribuyeron",
            ],
            "no": [
                "Cerrar, revisar o aprobar",
                "Tener otro rol o una cuenta permanente",
            ],
        },
    }
    # "marimo export html ... -- --estatico" genera la versión sin Python detrás.
    ESTATICO = "estatico" in mo.cli_args()
    selector_rol = mo.ui.dropdown(
        options=list(ROLES.keys()),
        value="Coordinador/a del Área Técnica",
        label="Rol",
    )
    return ESTATICO, ROLES, selector_rol


@app.cell(hide_code=True)
def _(mo):
    mo.Html(
        """
        <div class="fx-cover">
          <div class="fx-cover-mark">FICOTOX</div>
          <h1 class="fx-cover-title">Plataforma de gestión del laboratorio</h1>
          <div class="fx-cover-sub">Avance · septiembre 2026</div>
          <div class="fx-cover-foot">LN-FICOTOX · CICESE</div>
        </div>
        """
    )
    return


@app.cell(hide_code=True)
def _(captura, encabezado, lista, mo):
    mo.vstack(
        [
            encabezado(2, "¿Qué es y qué base sigue?", "Introducción"),
            lista(
                [
                    "Plataforma <b>local</b> para registrar y controlar el trabajo del laboratorio bajo <b>ISO/IEC 17025</b>.",
                    "Implementa la especificación <b>“Roles de usuario y permisos”</b> (basada en FX-MO-2-1 y FX-GCP-CD).",
                    "Principios: <b>cuentas individuales</b>, cada quien ve solo lo que le toca, <b>nadie aprueba lo suyo</b>, nada se borra, todo queda registrado.",
                ]
            ),
            mo.hstack(
                [
                    mo.vstack(
                        [
                            mo.stat("10 roles", label="Cuentas y permisos", caption="Con vigencia y reglas de combinación", bordered=True),
                            mo.stat("Flujo completo", label="Muestras", caption="De la recepción a la disposición final", bordered=True),
                            mo.stat("Sellada e íntegra", label="Bitácora", caption="Se verifica sola", bordered=True),
                        ],
                        gap=0.8,
                    ).style({"zoom": "1.2"}),
                    captura("inicio.png", ancho="700px", pie="Inicio: lo que está en curso y los avisos"),
                ],
                widths=[1, 1.9],
                gap=2,
                align="start",
            ),
        ],
        gap=1.5,
    )
    return


@app.cell(hide_code=True)
def _(captura, encabezado, mo):
    mo.vstack(
        [
            encabezado(3, "El flujo de una muestra", "Operación"),
            mo.mermaid(
                """
                flowchart LR
                  A[Recepción] --> B[Asignación] --> C[Procesamiento] --> D["Extracción<br/>(ASP / DSP)"] --> E[Análisis]
                  E --> F["Revisión y<br/>aprobación"] --> G[Informe] --> H[Liberación] --> I["Envío por<br/>correo"] --> J["Disposición<br/>final"]
                  classDef paso fill:#e6f2f5,stroke:#0F7A95,color:#0b3f4d;
                  class A,B,C,D,E,F,G,H,I,J paso;
                """
            ).style({"width": "100%"}),
            mo.hstack(
                [
                    mo.md(
                        "Cada etapa guarda **quién la hizo**, con qué **equipos e insumos**, "
                        "y **quién la supervisó o aprobó**."
                    ).style({"font-size": "1.35rem", "max-width": "26rem"}),
                    captura("recepcion.png", ancho="720px", pie="Ficha de la recepción R 0000001 (cerrada)"),
                ],
                align="center",
                justify="space-between",
                gap=2,
            ),
        ],
        gap=1,
    )
    return


@app.cell(hide_code=True)
def _(ESTATICO, ROLES, captura, encabezado, mo, selector_rol):
    def _columna(titulo, items, clase):
        lis = "".join(f"<li>{i}</li>" for i in items)
        return mo.Html(f'<div class="fx-col {clase}"><div class="fx-col-t">{titulo}</div><ul>{lis}</ul></div>')

    def _ficha(nombre):
        rol = ROLES[nombre]
        nota = (
            mo.callout(mo.md(f"**Pendiente:** {rol['nota']}"), kind="warn")
            if rol.get("nota")
            else mo.md("")
        )
        return mo.vstack(
            [
                mo.hstack(
                    [_columna("Puede", rol["puede"], "fx-si"), _columna("No puede", rol["no"], "fx-no")],
                    widths="equal",
                    gap=1,
                    align="start",
                ),
                nota,
            ],
            gap=1,
        )

    if ESTATICO:
        # HTML estático (sin Python detrás): pestañas, que funcionan en el navegador.
        _roles = mo.ui.tabs({n: _ficha(n) for n in ROLES}, value=selector_rol.value, orientation="vertical")
        _ancho_captura = "300px"
    else:
        # En vivo (marimo run): selector reactivo.
        _roles = mo.vstack([mo.hstack([selector_rol]).style({"zoom": "1.25"}), _ficha(selector_rol.value)], gap=1)
        _ancho_captura = "470px"

    mo.vstack(
        [
            encabezado(4, "Roles: quién hace qué", "Accesos"),
            mo.hstack(
                [
                    _roles,
                    captura("roles.png", ancho=_ancho_captura, pie="Matriz de permisos de un rol"),
                ],
                widths=[2.4, 1] if ESTATICO else [1.7, 1],
                gap=1.5,
                align="start",
            ),
        ],
        gap=1,
    )
    return


@app.cell(hide_code=True)
def _(encabezado, mo):
    _tarjetas = [
        ("Autorización del personal", "FX-THF-AP: solo opera los métodos y equipos para los que está autorizado."),
        ("Separación de funciones", "Nadie revisa ni aprueba su propio trabajo."),
        ("Segundo usuario", "Anulaciones y cambios de acceso los aprueba otra persona."),
        ("Firmas con contraseña", "Cada firma es de una cuenta real, con la contraseña de quien firma."),
        ("Confirmación al decidir", "Se pide la contraseña al aprobar, liberar o anular."),
        ("Cuentas seguras", "Cuentas temporales supervisadas, bloqueo por intentos y cierre de sesión por inactividad."),
    ]
    _html = "".join(
        f'<div class="fx-card"><div class="fx-card-n">{i:02d}</div><div class="fx-card-t">{t}</div><div class="fx-card-d">{d}</div></div>'
        for i, (t, d) in enumerate(_tarjetas, 1)
    )
    mo.vstack(
        [
            encabezado(5, "Controles que protegen los resultados", "Confiabilidad"),
            mo.Html(f'<div class="fx-grid">{_html}</div>'),
        ],
        gap=1.5,
    )
    return


@app.cell(hide_code=True)
def _(captura, encabezado, lista, mo):
    _pasos = ["Borrador", "Revisión", "Autorizado", "Liberado", "Enviado"]
    _flujo = mo.Html(
        '<div class="fx-steps">'
        + '<span class="fx-arrow">→</span>'.join(f'<span class="fx-step">{p}</span>' for p in _pasos)
        + "</div>"
    )
    mo.vstack(
        [
            encabezado(6, "Informes de resultados", "Operación"),
            _flujo,
            mo.hstack(
                [
                    lista(
                        [
                            "Al <b>liberar</b> se genera el PDF final con huella digital; ya no se edita.",
                            "Correcciones por <b>enmienda</b>: versión nueva, la original se conserva.",
                            "Envío por correo con <b>evidencia</b> y confirmación de recepción.",
                            "Si se corrige un análisis ya informado, el informe queda marcado <b>“requiere enmienda”</b>.",
                        ]
                    ),
                    captura("informe.png", ancho="560px", pie="IR 0000001 · panel “Envíos por correo”"),
                ],
                widths=[1, 1.15],
                gap=2,
                align="start",
            ),
        ],
        gap=1.2,
    )
    return


@app.cell(hide_code=True)
def _(encabezado, mo):
    def _bloque(titulo, items):
        lis = "".join(f"<li>{i}</li>" for i in items)
        return mo.Html(f'<div class="fx-panel"><div class="fx-panel-t">{titulo}</div><ul class="fx-list">{lis}</ul></div>')

    mo.vstack(
        [
            encabezado(7, "Documentos del SGC, inventario y equipos", "Soporte"),
            mo.hstack(
                [
                    _bloque(
                        "Documentos del SGC",
                        [
                            "Propuesta → revisión de calidad → revisión técnica → aprobación → vigente.",
                            "Distribución con confirmación <b>“Leí y comprendí”</b>.",
                            "Lista maestra exportable.",
                        ],
                    ),
                    _bloque(
                        "Inventario y equipos",
                        [
                            "Reactivos, consumibles y equipos.",
                            "Descuento automático al usar insumos.",
                            "Avisos de stock bajo, calibración y mantenimiento.",
                            "Bitácora de uso de equipos.",
                        ],
                    ),
                ],
                widths="equal",
                gap=1.5,
                align="stretch",
            ),
        ],
        gap=1.5,
    )
    return


@app.cell(hide_code=True)
def _(captura, encabezado, lista, mo):
    mo.vstack(
        [
            encabezado(8, "Trazabilidad y auditoría", "Confiabilidad"),
            mo.hstack(
                [
                    mo.vstack(
                        [
                            lista(
                                [
                                    "Cada acción queda registrada: <b>quién, cuándo, con qué cargo, qué cambió y por qué</b>.",
                                    "Registro <b>sellado</b>: se verifica solo y avisa si alguien lo altera.",
                                    "Se exporta completo o por muestra para una auditoría.",
                                ]
                            ),
                            mo.callout(
                                mo.md(
                                    "**Caso de ejemplo:** muestra de mejillón para DSP, de la recepción "
                                    "al envío del informe, realizado por 4 personas distintas."
                                ),
                                kind="info",
                            ),
                        ],
                        gap=1,
                    ),
                    captura("auditoria.png", ancho="700px", pie="Auditoría con el detalle de una entrada"),
                ],
                widths=[1, 1.6],
                gap=1.5,
                align="start",
            ),
        ],
        gap=1.2,
    )
    return


@app.cell(hide_code=True)
def _(encabezado, mo):
    mo.vstack(
        [
            encabezado(9, "¿Qué tanto cubre la especificación?", "Estado"),
            mo.Html('<div class="fx-table">' + mo.md(
                """
    | | Sección de la especificación | Estado |
    |:-:|---|---|
    | ✅ | Principios, modelo de autorización, documentos SGC, informes y envío, conflictos de funciones, requisitos de implementación | Completo |
    | ⚠️ | Catálogo de roles y matriz | Existen los 10 roles; algunas funciones y alcances dependen de módulos pendientes |
    | ⚠️ | Muestras | Falta adjuntar la evidencia instrumental a los resultados |
    | ⚠️ | Respaldo | Falta la prueba de recuperación documentada |
    | ⏳ | Aprobación formal de la matriz (sección 13) | Pendiente |
                """
            ).text + "</div>"),
            mo.Html('<div style="color:#5b6b72;font-size:1rem">✅ completo · ⚠️ parcial · ⏳ pendiente</div>'),
        ],
        gap=1,
    )
    return


@app.cell(hide_code=True)
def _(encabezado, mo):
    _pasos = [
        "Resolver las <b>preguntas</b> de esta presentación.",
        "<b>Aprobación formal</b> de la matriz de permisos (Mejora Continua, Coord. Técnica y Responsable General).",
        "<b>Módulos pendientes:</b> incidencias y no conformidades, auditorías internas, compras y proveedores, proyectos de investigación.",
        "Adjuntar <b>evidencia instrumental</b> a los resultados.",
        "Formatos de <b>PSP, pigmentos y sedimentos</b> (cuando se entreguen).",
        "Cargar al <b>personal real</b> con sus roles y autorizaciones FX-THF-AP.",
        "Prueba de respaldo y recuperación; pruebas con el personal; capacitación y manuales; <b>validación y entrega en diciembre</b>.",
    ]
    _lis = "".join(f"<li>{p}</li>" for p in _pasos)
    mo.vstack(
        [
            encabezado(10, "Siguientes pasos", "Plan"),
            mo.Html(f'<ol class="fx-ol">{_lis}</ol>'),
        ],
        gap=1.2,
    )
    return


@app.cell(hide_code=True)
def _(encabezado, mo, preguntas):
    _roles = preguntas(
        [
            ("¿Una persona puede tener varios roles? ¿Qué combinaciones deben prohibirse?",
             "sí, con vigencia y con combinaciones prohibidas (p. ej., el Auditor no puede ser también analista)."),
            ("¿Quién aprueba altas y cambios de acceso?", "el Responsable General."),
            ("¿Quién puede anular registros?",
             "Coord. Técnica en lo técnico, Mejora Continua en documentos y calidad, Responsable General en casos excepcionales."),
            ("¿Cambiar los permisos de un rol debe aprobarlo un segundo usuario?", "no, solo queda registrado."),
            ("¿Quién cubre las suplencias y por cuánto tiempo?", None),
            ("¿Una estancia temporal con rol de Técnico Analista debe quedar supervisada?",
             "sí: todo lo que captura una cuenta temporal espera el visto bueno de su supervisor."),
        ]
    )
    _firmas = preguntas(
        [
            ("¿Quien revisa puede ser también quien aprueba, si no elaboró el trabajo?", "sí."),
            ("¿Se permite una excepción por falta de personal? ¿Quién la aprueba?",
             "sí, la aprueba Mejora Continua o el Responsable General."),
            ("Cuando firma otra persona, escribe su propia contraseña en el equipo. ¿Es práctico en el laboratorio?", None),
            ("Se pide contraseña en cada aprobación, liberación o anulación. ¿Es aceptable en el día a día?", None),
            ("¿Puede liberar un informe la misma persona que lo autorizó?", "sí."),
        ]
    )
    _muestras = preguntas(
        [
            ("¿Quién registra las autorizaciones FX-THF-AP?", "Coord. Técnica, Mejora Continua o Responsable General."),
            ("¿Todo lo que captura un estudiante o cuenta temporal debe pasar por visto bueno?", "sí."),
            ("¿Qué evidencia instrumental se adjunta a los resultados (cromatogramas, hojas de cálculo, otros)?", None),
            ("Confirmar los límites precargados: ASP 20 µg/g, DSP 160 µg/kg eq. ácido okadaico, PSP 80 µg eq. STX/100 g.", None),
            ("Confirmar las claves oficiales de los formatos de análisis (FX-TCI-…) y de informe (FX-TCF-IR).", None),
            ("¿Cuándo tendremos los formatos de PSP, pigmentos y sedimentos?", None),
            ("¿Se necesita un catálogo de clientes o basta con capturarlos en cada recepción?",
             "el solicitante se escribe en cada recepción."),
            ("¿La preparación de reactivos (FX-TCR-PR) necesita su propio registro?", "el folio se escribe como texto."),
            ("¿Así trabaja el laboratorio: el analista envía su análisis a revisión y solo entonces se revisa?", "sí, no se revisa lo que no se ha enviado."),
        ]
    )
    mo.vstack(
        [
            encabezado(11, "Preguntas para el laboratorio (1 de 2)", "Decisiones"),
            mo.ui.tabs(
                {
                    "Roles y accesos": _roles,
                    "Separación de funciones y firmas": _firmas,
                    "Muestras y análisis": _muestras,
                }
            ),
        ],
        gap=1,
    )
    return


@app.cell(hide_code=True)
def _(encabezado, mo, preguntas):
    _informes = preguntas(
        [
            ("¿Quién envía los informes al cliente? ¿Puede hacerlo personal administrativo?",
             "quien puede aprobar informes."),
            ("¿Habrá un servidor de correo para enviar desde la plataforma, o el envío será manual con evidencia?",
             "manual; el automático es opcional."),
            ("¿Registrar un envío debe pedir contraseña?", "no."),
            ("¿Todos los documentos requieren revisión técnica además de la de calidad?", "solo si se marca."),
        ]
    )
    _operacion = preguntas(
        [
            ("Prioridad entre incidencias y no conformidades, auditorías internas, compras y proveedores, proyectos de investigación. ¿Qué formatos usan hoy para cada uno?", None),
            ("¿En qué computadora se instalará, quién será responsable y quiénes accederán desde la red local?", None),
            ("Respaldos: ¿cada cuánto, dónde se guardan las copias y quién hace la prueba de recuperación?", None),
            ("Lista del personal real con sus roles y autorizaciones para cargarlos.", None),
            ("¿Con cuánta anticipación avisar vencimientos?",
             "cuentas y roles, 7 días antes; autorizaciones FX-THF-AP, 30 días antes."),
        ]
    )
    mo.vstack(
        [
            encabezado(12, "Preguntas para el laboratorio (2 de 2)", "Decisiones"),
            mo.ui.tabs(
                {
                    "Informes y documentos": _informes,
                    "Módulos pendientes y operación": _operacion,
                }
            ),
            mo.md("Gracias · **LN-FICOTOX · CICESE**").style({"color": "#5b6b72", "margin-top": "0.5rem"}),
        ],
        gap=1,
    )
    return


if __name__ == "__main__":
    app.run()
