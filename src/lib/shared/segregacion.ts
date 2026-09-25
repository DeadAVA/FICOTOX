/*
 * Separacion de funciones (Fase 3; "Roles y permisos FICOTOX", secciones 2, 6 y 7).
 * Catalogo versionado de reglas de dos personas. Se evaluan en el SERVIDOR por
 * persona (id de usuario): no importa cuantos roles tenga ni con que cargo actue.
 *
 * "Elaboro" = quien creo el registro y cualquier persona que haya editado su
 * contenido tecnico (se toma de la bitacora del registro).
 *
 * Una excepcion aprobada por un segundo usuario (solicitud "excepcion_segregacion",
 * Fase 3 seccion 3) permite a una persona concreta una accion concreta sobre
 * un registro concreto; queda registrada en el registro y en la bitacora.
 */

export const VERSION_SEGREGACION = "2026-09-24.1";

export type AccionSegregada = "revisar" | "aprobar" | "autorizar" | "supervisar" | "aprobar_solicitud";

export interface Regla {
  numero: number;
  clave: string;
  titulo: string;
  /* Que se evalua, en palabras, para la documentacion y la interfaz. */
  descripcion: string;
}

export const REGLAS_SEGREGACION: Regla[] = [
  { numero: 1, clave: "analisis", titulo: "Analisis: quien lo elaboro no lo revisa ni lo aprueba", descripcion: "Revisor y aprobador pueden ser la misma persona, pero ninguno de los dos elaboro el analisis." },
  { numero: 2, clave: "informe", titulo: "Informe: quien lo elaboro, o elaboro un analisis incluido, no lo revisa ni lo autoriza", descripcion: "El Analista no valida ni libera su propio resultado." },
  { numero: 3, clave: "supervision_captura", titulo: "Procesamiento y extraccion: quien firma como supervisor no proceso, extrajo ni hizo la limpieza", descripcion: "Se comparan los nombres firmados en el formato." },
  { numero: 4, clave: "visto_bueno", titulo: "Supervision: el supervisor no da visto bueno a lo que el mismo capturo", descripcion: "Aplica al alcance supervisado y a las cuentas temporales." },
  { numero: 5, clave: "documentos", titulo: "Documentos SGC: quien elaboro no revisa ni aprueba; revisor y aprobador no son la misma persona", descripcion: "Revisor de calidad, revisor tecnico y aprobador no pueden ser todos la misma persona." },
  { numero: 6, clave: "segundo_usuario", titulo: "Segundo usuario: quien solicita una accion critica no la aprueba", descripcion: "La aprobacion de una solicitud la da otra persona con el permiso que exige la accion." },
];

export const reglaPorClave = (clave: string): Regla | undefined => REGLAS_SEGREGACION.find((r) => r.clave === clave);

export interface Violacion {
  regla: number;
  clave: string;
  /* Frase para la persona: "Elaboraste este analisis; lo debe revisar otra persona". */
  mensaje: string;
}

const ETIQUETA_ACCION: Record<string, string> = { revisar: "revisar", aprobar: "aprobar", autorizar: "autorizar", supervisar: "dar el visto bueno a", aprobar_solicitud: "aprobar" };
const lo = (accion: string) => ETIQUETA_ACCION[accion] || accion;

/* ¿Tiene esta persona una excepcion aprobada para esta accion? */
export interface ExcepcionSegregacion {
  solicitud_id: number;
  usuario_id: number;
  accion: string;
  aprobado_por?: number | null;
  aprobado_en?: string | null;
}
export const excepcionPara = (excepciones: ExcepcionSegregacion[] | null | undefined, usuarioId: number, accion: string): ExcepcionSegregacion | null =>
  (excepciones || []).find((e) => Number(e.usuario_id) === Number(usuarioId) && e.accion === accion) || null;

/* Regla 1: analisis. `elaboradores` incluye a quien lo creo y a quien lo edito. */
export function evaluarAnalisis(usuarioId: number, elaboradores: Iterable<number>, accion: "revisar" | "aprobar"): Violacion | null {
  if (![...elaboradores].some((id) => Number(id) === Number(usuarioId))) return null;
  return { regla: 1, clave: "analisis", mensaje: `Elaboraste este análisis; lo debe ${lo(accion)} otra persona` };
}

/* Regla 2: informe. `elaboradoresInforme` y los elaboradores de cada analisis incluido. */
export function evaluarInforme(usuarioId: number, elaboradoresInforme: Iterable<number>, elaboradoresAnalisis: Array<{ folio: string; elaboradores: Iterable<number> }>, accion: "revisar" | "autorizar"): Violacion | null {
  const yo = Number(usuarioId);
  if ([...elaboradoresInforme].some((id) => Number(id) === yo)) return { regla: 2, clave: "informe", mensaje: `Elaboraste este informe; lo debe ${lo(accion)} otra persona` };
  const propios = elaboradoresAnalisis.filter((a) => [...a.elaboradores].some((id) => Number(id) === yo)).map((a) => a.folio);
  if (propios.length) return { regla: 2, clave: "informe", mensaje: `Elaboraste ${propios.length === 1 ? "el análisis" : "los análisis"} ${propios.join(", ")} incluido${propios.length === 1 ? "" : "s"} en este informe; el Analista no valida ni libera su propio resultado. Lo debe ${lo(accion)} otra persona` };
  return null;
}

/* Nombre normalizado para comparar personas firmadas en un formato. */
export const nombreNormalizado = (value: unknown): string =>
  String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/* Regla 3: procesamiento / extraccion: quien firma "superviso" no es quien proceso, extrajo o limpio. */
/* Fase 5: compara cuentas (usuario_id) cuando ambas firmas estan ligadas; si no, los nombres escritos. */
export function evaluarSupervisionCaptura(superviso: unknown, ejecutores: Array<{ etiqueta: string; nombre: unknown; usuarioId?: unknown }>, supervisoId?: unknown): Violacion | null {
  const supId = Number(supervisoId) || 0;
  const sup = nombreNormalizado(superviso);
  if (!sup && !supId) return null;
  const coincide = ejecutores.find((e) => {
    const id = Number(e.usuarioId) || 0;
    if (supId && id) return supId === id;
    return !!sup && !!nombreNormalizado(e.nombre) && nombreNormalizado(e.nombre) === sup;
  });
  if (!coincide) return null;
  return { regla: 3, clave: "supervision_captura", mensaje: `Quien supervisó no puede ser la misma persona que ${coincide.etiqueta}; debe firmar otra persona como supervisor` };
}

/* Regla 4: visto bueno del supervisor sobre lo capturado por otra persona. */
export function evaluarVistoBueno(usuarioId: number, capturadoPor: number | null | undefined): Violacion | null {
  if (capturadoPor === null || capturadoPor === undefined || Number(capturadoPor) !== Number(usuarioId)) return null;
  return { regla: 4, clave: "visto_bueno", mensaje: "Capturaste o editaste este registro; el visto bueno lo debe dar otra persona" };
}

/* Regla 5: documentos SGC. */
export function evaluarDocumento(usuarioId: number, elaboradores: Iterable<number>, revisorId: number | null | undefined, accion: "revisar" | "aprobar"): Violacion | null {
  const yo = Number(usuarioId);
  if ([...elaboradores].some((id) => Number(id) === yo)) return { regla: 5, clave: "documentos", mensaje: `Elaboraste este documento; lo debe ${lo(accion)} otra persona` };
  if (accion === "aprobar" && revisorId !== null && revisorId !== undefined && Number(revisorId) === yo) return { regla: 5, clave: "documentos", mensaje: "Revisaste este documento; lo debe aprobar otra persona" };
  return null;
}

/* Regla 6: segundo usuario. */
export function evaluarSegundoUsuario(usuarioId: number, solicitadoPor: number | null | undefined): Violacion | null {
  if (solicitadoPor === null || solicitadoPor === undefined || Number(solicitadoPor) !== Number(usuarioId)) return null;
  return { regla: 6, clave: "segundo_usuario", mensaje: "Solicitaste esta acción; la debe aprobar otra persona" };
}
