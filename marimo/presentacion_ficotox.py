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
    import base64
    import struct
    from pathlib import Path

    import marimo as mo

    ASSETS = (mo.notebook_dir() or Path(__file__).parent) / "assets"
    TOTAL = 9

    def encabezado(n, titulo, seccion=""):
        """Encabezado común: sección, título y folio en monoespaciada."""
        return mo.Html(
            f'<div class="fx-head">'
            f'<div><div class="fx-kicker">{seccion}</div>'
            f'<h2 class="fx-title">{titulo}</h2></div>'
            f'<div class="fx-folio">{n:02d} / {TOTAL:02d}</div>'
            f"</div>"
        )

    def captura(nombre, pie, resta=330):
        """Captura incrustada que se amplía al hacer clic (sin JavaScript).

        La imagen ocupa todo el ancho de su columna, pero nunca más alto que
        la pantalla menos `resta` píxeles (encabezado, pie y márgenes), así que
        no se sale de la diapositiva y conserva su proporción. Va dentro de un
        <details>: al abrirlo, el <summary> cubre la diapositiva con la imagen
        en grande; otro clic la cierra.
        """
        datos = (ASSETS / nombre).read_bytes()
        ancho, alto = struct.unpack(">II", datos[16:24])  # cabecera IHDR del PNG
        src = "data:image/png;base64," + base64.b64encode(datos).decode()
        return mo.Html(
            f'<figure class="fx-fig" style="--fx-ar:{ancho / alto:.3f};--fx-resta:{resta}px">'
            f'<details class="fx-zoom"><summary title="Clic para ampliar">'
            f'<img src="{src}" alt="{pie}"></summary></details>'
            f"<figcaption>{pie} <span>· clic para ampliar</span></figcaption></figure>"
        )

    def lista(items, clase="fx-list"):
        lis = "".join(f"<li>{i}</li>" for i in items)
        return mo.Html(f'<ul class="{clase}">{lis}</ul>')

    return captura, encabezado, lista, mo


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
            mo.hstack(
                [
                    mo.vstack(
                        [
                            lista(
                                [
                                    "Plataforma <b>local</b> para el trabajo del laboratorio bajo <b>ISO/IEC 17025</b>.",
                                    "Implementa <b>“Roles de usuario y permisos”</b> (FX-MO-2-1 y FX-GCP-CD).",
                                    "<b>Cuentas individuales</b>, <b>nadie aprueba lo suyo</b>, nada se borra y todo queda registrado.",
                                ],
                                "fx-list fx-list-sm",
                            ),
                            mo.Html(
                                '<div class="fx-cifras">'
                                "<div><b>10 roles</b><span>con vigencia y reglas de combinación</span></div>"
                                "<div><b>Flujo completo</b><span>de la recepción a la disposición final</span></div>"
                                "<div><b>Bitácora sellada</b><span>se verifica sola</span></div>"
                                "</div>"
                            ),
                        ],
                        gap=1.2,
                    ),
                    captura("inicio.png", "Inicio: lo que está en curso y los avisos"),
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
    _etapas = [
        "Recepción", "Asignación", "Procesamiento", "Extracción (ASP / DSP)", "Análisis",
        "Revisión y aprobación", "Informe", "Liberación", "Envío por correo", "Disposición final",
    ]
    _flujo = mo.Html(
        '<ol class="fx-flujo">' + "".join(f"<li>{e}</li>" for e in _etapas) + "</ol>"
        '<p class="fx-nota">Cada etapa guarda <b>quién la hizo</b>, con qué <b>equipos e insumos</b> '
        "y <b>quién la supervisó o aprobó</b>.</p>"
    )
    mo.vstack(
        [
            encabezado(3, "El flujo de una muestra", "Operación"),
            mo.hstack(
                [_flujo, captura("recepcion.png", "Ficha de la recepción R 0000001 (cerrada)")],
                widths=[1, 2.3],
                gap=2,
                align="start",
            ),
        ],
        gap=1.5,
    )
    return


@app.cell(hide_code=True)
def _(ESTATICO, ROLES, captura, encabezado, mo, selector_rol):
    _CORTO = {
        "Administrador técnico del sistema": "Adm. técnico",
        "Responsable General": "Resp. General",
        "Coordinador/a de Mejora Continua": "Mejora Continua",
        "Coordinador/a del Área Técnica": "Coord. Técnica",
        "Coordinador/a de Investigación y Desarrollo": "Coord. I+D",
        "Técnico Analista": "Téc. Analista",
        "Técnico Auxiliar": "Téc. Auxiliar",
        "Administrador/a Auxiliar": "Adm. Auxiliar",
        "Auditor Interno": "Auditor Interno",
        "Estudiante / personal en formación": "Estudiante",
    }

    def _columna(titulo, items, clase):
        lis = "".join(f"<li>{i}</li>" for i in items)
        return f'<div class="fx-col {clase}"><div class="fx-col-t">{titulo}</div><ul>{lis}</ul></div>'

    def _ficha(nombre):
        rol = ROLES[nombre]
        nota = f'<div class="fx-pend"><b>Pendiente:</b> {rol["nota"]}</div>' if rol.get("nota") else ""
        return mo.Html(
            '<div class="fx-ficha">'
            + _columna("Puede", rol["puede"], "fx-si")
            + _columna("No puede", rol["no"], "fx-no")
            + nota
            + "</div>"
        )

    if ESTATICO:
        # HTML estático (sin Python detrás): pestañas, que funcionan en el navegador.
        _roles = mo.ui.tabs(
            {_CORTO[n]: _ficha(n) for n in ROLES},
            value=_CORTO[selector_rol.value],
            orientation="vertical",
        ).style({"font-size": "0.95rem"})
    else:
        # En vivo (marimo run): selector reactivo.
        _roles = mo.vstack([mo.hstack([selector_rol]).style({"zoom": "1.15"}), _ficha(selector_rol.value)], gap=0.8)

    mo.vstack(
        [
            encabezado(4, "Roles: quién hace qué", "Accesos"),
            mo.hstack(
                [_roles, captura("roles.png", "Matriz de permisos del rol Coord. del Área Técnica")],
                widths=[1, 1.6],
                gap=1.5,
                align="start",
            ),
        ],
        gap=1.5,
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
            mo.hstack(
                [
                    mo.vstack(
                        [
                            _flujo,
                            lista(
                                [
                                    "Al <b>liberar</b> se genera el PDF final con huella digital; ya no se edita.",
                                    "Correcciones por <b>enmienda</b>: versión nueva; la original se conserva.",
                                    "Envío por correo con <b>evidencia</b> y confirmación de recepción.",
                                    "Si cambia un análisis ya informado: <b>“requiere enmienda”</b>.",
                                ],
                                "fx-list fx-list-sm",
                            ),
                        ],
                        gap=1.2,
                    ),
                    captura("informe.png", "IR 0000001: firmas y panel “Envíos por correo”"),
                ],
                widths=[1, 2.3],
                gap=2,
                align="start",
            ),
        ],
        gap=1.5,
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
                                    "Cada acción registra <b>quién, cuándo, con qué cargo, qué cambió y por qué</b>.",
                                    "Registro <b>sellado</b>: se verifica solo y avisa si alguien lo altera.",
                                    "Se exporta completo o por muestra.",
                                ],
                                "fx-list fx-list-sm",
                            ),
                            mo.Html(
                                '<div class="fx-caso"><b>Caso de ejemplo:</b> mejillón para DSP, de la recepción '
                                "al envío del informe, hecho por 4 personas distintas.</div>"
                            ),
                        ],
                        gap=1.2,
                    ),
                    captura("auditoria.png", "Auditoría: lista de movimientos y detalle de una anulación"),
                ],
                widths=[1, 2.3],
                gap=2,
                align="start",
            ),
        ],
        gap=1.5,
    )
    return


@app.cell(hide_code=True)
def _(encabezado, mo):
    _pasos = [
        "<b>Aprobación formal</b> de la matriz de permisos (Mejora Continua, Coord. Técnica y Responsable General).",
        "<b>Módulos pendientes:</b> incidencias y no conformidades, auditorías internas, compras y proveedores, proyectos de investigación.",
        "Adjuntar <b>evidencia instrumental</b> a los resultados.",
        "<b>Formatos pendientes:</b> PSP, pigmentos y sedimentos.",
        "Cargar al <b>personal real</b> con sus roles y autorizaciones FX-THF-AP.",
        "Prueba de respaldo y recuperación; pruebas con el personal; capacitación y manuales.",
    ]
    _lis = "".join(f"<li>{p}</li>" for p in _pasos)
    mo.vstack(
        [
            encabezado(9, "Siguientes pasos", "Plan"),
            mo.Html(f'<ol class="fx-ol">{_lis}</ol>'),
            mo.md("Gracias · **LN-FICOTOX · CICESE**").style({"color": "#5b6b72", "margin-top": "0.5rem"}),
        ],
        gap=1.2,
    )
    return


if __name__ == "__main__":
    app.run()
