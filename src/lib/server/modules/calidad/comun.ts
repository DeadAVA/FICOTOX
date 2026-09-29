/*
 * Calidad (Fase 11): esquema y utilidades comunes de incidencias, no
 * conformidades, acciones correctivas, comunicaciones, suspensiones y
 * retenciones (ISO/IEC 17025 7.10 y 8.7).
 *
 * Acceso (FX-MO-2-1 seccion 5, columna Calidad):
 * - calidad:V "total" ve todo; con el alcance "incidencias" solo las incidencias
 *   que la persona reporto y las NC o acciones de las que es responsable (nunca
 *   la bitacora: ese alcance no cuenta sin objeto, ver permisos.ts).
 * - Admin tecnico (calidad:V "bitacora") no ve incidencias ni NC.
 * Nada se borra: anular exige motivo y un segundo usuario (solicitud).
 */
import type { CurrentUser } from "../../auth";
import { userIdFromClaims } from "../../auth";
import { isSqlite, type Row, type Session } from "../../db";
import { HttpError } from "../../http";
import { cargarAutorizacion, permisoDe, requirePermission, type Autorizacion, type Permiso } from "../../rbac";
import { addColumnIfMissing, markSchemaReady, schemaReady } from "../../schema";
import type { Accion } from "../../../shared/permisos";
import { hoyLocal } from "../../../shared/fechas";

export const T = {
  incidencias: "incidencias",
  registros: "incidencia_registros",
  nc: "no_conformidades",
  afectados: "nc_registros_afectados",
  verificaciones: "nc_verificaciones",
  acciones: "acciones_correctivas",
  comunicaciones: "nc_comunicaciones",
  suspensiones: "suspensiones",
  retenciones: "retenciones_informe",
} as const;

const idCol = () => (isSqlite() ? "id INTEGER PRIMARY KEY AUTOINCREMENT" : "id INT AUTO_INCREMENT PRIMARY KEY");
const texto = () => (isSqlite() ? "TEXT" : "LONGTEXT");
const fin = () => (isSqlite() ? "" : " ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

async function indice(s: Session, tabla: string, nombre: string, columnas: string, unico = false): Promise<void> {
  if (isSqlite()) {
    await s.execute(`CREATE ${unico ? "UNIQUE " : ""}INDEX IF NOT EXISTS ${nombre} ON ${tabla} (${columnas})`);
    return;
  }
  const existe = await s.scalar("SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND INDEX_NAME = :i", { t: tabla, i: nombre });
  if (!Number(existe || 0)) await s.execute(`CREATE ${unico ? "UNIQUE " : ""}INDEX ${nombre} ON ${tabla} (${columnas})`);
}

/* Columnas de anulacion y de excepcion de segregacion (comunes). */
const ANULACION = `anulado_en VARCHAR(40) DEFAULT NULL, anulado_por INT DEFAULT NULL, anulado_rol VARCHAR(120) DEFAULT NULL, motivo_anulacion TEXT, estado_previo VARCHAR(30) DEFAULT NULL`;

/* Una sola vez por proceso; sin commit (lo confirma el bootstrap o la peticion). */
export async function ensureCalidadSchema(s: Session): Promise<void> {
  if (schemaReady("calidad_fase11")) return;
  const tx = texto();
  await s.execute(
    `CREATE TABLE IF NOT EXISTS ${T.incidencias} (
      ${idCol()}, folio_num INT NOT NULL, tipo VARCHAR(30) NOT NULL, fecha_hora_ocurrencia VARCHAR(40) NOT NULL,
      descripcion ${tx} NOT NULL, accion_inmediata ${tx}, impacto_resultados VARCHAR(12) NOT NULL DEFAULT 'desconocido',
      estado VARCHAR(20) NOT NULL DEFAULT 'reportada',
      reportada_por INT DEFAULT NULL, reportada_nombre VARCHAR(180) DEFAULT NULL, reportada_rol VARCHAR(120) DEFAULT NULL, reportada_en VARCHAR(40) NOT NULL,
      origen_automatico VARCHAR(30) DEFAULT NULL, clave_automatica VARCHAR(200) DEFAULT NULL,
      en_evaluacion_por INT DEFAULT NULL, en_evaluacion_en VARCHAR(40) DEFAULT NULL,
      evaluada_por INT DEFAULT NULL, evaluada_rol VARCHAR(120) DEFAULT NULL, evaluada_en VARCHAR(40) DEFAULT NULL,
      decision_evaluacion VARCHAR(20) DEFAULT NULL, justificacion ${tx}, nc_id INT DEFAULT NULL,
      ${ANULACION}, excepciones_json ${tx}
    )${fin()}`,
  );
  await indice(s, T.incidencias, "uq_incidencias_folio", "folio_num", true);
  await indice(s, T.incidencias, "idx_incidencias_reportada", "reportada_por");
  await indice(s, T.incidencias, "idx_incidencias_clave_auto", "clave_automatica");
  await s.execute(`CREATE TABLE IF NOT EXISTS ${T.registros} (${idCol()}, incidencia_id INT NOT NULL, entidad VARCHAR(40) NOT NULL, entidad_id INT NOT NULL, referencia VARCHAR(160) DEFAULT NULL)${fin()}`);
  await indice(s, T.registros, "idx_inc_registros_inc", "incidencia_id");
  await indice(s, T.registros, "idx_inc_registros_entidad", "entidad, entidad_id");
  await s.execute(
    `CREATE TABLE IF NOT EXISTS ${T.nc} (
      ${idCol()}, folio_num INT NOT NULL, origen VARCHAR(30) NOT NULL, incidencia_id INT DEFAULT NULL,
      clasificacion VARCHAR(12) DEFAULT NULL, requisito_incumplido ${tx}, descripcion ${tx} NOT NULL,
      responsable_id INT DEFAULT NULL, estado VARCHAR(24) NOT NULL DEFAULT 'abierta',
      creada_por INT DEFAULT NULL, creada_rol VARCHAR(120) DEFAULT NULL, creada_en VARCHAR(40) NOT NULL,
      analisis_iniciado_en VARCHAR(40) DEFAULT NULL, acciones_iniciadas_en VARCHAR(40) DEFAULT NULL, verificacion_iniciada_en VARCHAR(40) DEFAULT NULL,
      afecta_resultados_emitidos VARCHAR(12) DEFAULT NULL, trabajo_detenido VARCHAR(12) DEFAULT NULL, notificar_cliente VARCHAR(12) DEFAULT NULL,
      impacto_notas ${tx}, impacto_evaluado_por INT DEFAULT NULL, impacto_evaluado_en VARCHAR(40) DEFAULT NULL,
      metodo_causa VARCHAR(20) DEFAULT NULL, desarrollo_causa ${tx}, causa_raiz ${tx},
      requiere_accion_correctiva VARCHAR(4) DEFAULT NULL, justificacion_sin_accion ${tx},
      requiere_actualizar_riesgos INT NOT NULL DEFAULT 0, nota_riesgos ${tx},
      requiere_cambio_documental INT NOT NULL DEFAULT 0, propuesta_documento_id INT DEFAULT NULL,
      verificacion_programada VARCHAR(10) DEFAULT NULL, reaperturas INT NOT NULL DEFAULT 0,
      cerrada_por INT DEFAULT NULL, cerrada_rol VARCHAR(120) DEFAULT NULL, cerrada_en VARCHAR(40) DEFAULT NULL, conclusion ${tx},
      archivo_pdf VARCHAR(200) DEFAULT NULL, pdf_sha256 VARCHAR(64) DEFAULT NULL,
      ${ANULACION}, excepciones_json ${tx}
    )${fin()}`,
  );
  await indice(s, T.nc, "uq_no_conformidades_folio", "folio_num", true);
  await indice(s, T.nc, "idx_nc_responsable", "responsable_id");
  await s.execute(`CREATE TABLE IF NOT EXISTS ${T.afectados} (${idCol()}, nc_id INT NOT NULL, entidad VARCHAR(40) NOT NULL, entidad_id INT NOT NULL, referencia VARCHAR(160) DEFAULT NULL, agregado_por INT DEFAULT NULL, agregado_en VARCHAR(40) NOT NULL)${fin()}`);
  await indice(s, T.afectados, "idx_nc_afectados_nc", "nc_id");
  await s.execute(
    `CREATE TABLE IF NOT EXISTS ${T.verificaciones} (${idCol()}, nc_id INT NOT NULL, fecha_programada VARCHAR(10) DEFAULT NULL, verificada_por INT DEFAULT NULL, verificada_rol VARCHAR(120) DEFAULT NULL,
      verificada_en VARCHAR(40) NOT NULL, resultado VARCHAR(12) NOT NULL, comentarios ${tx})${fin()}`,
  );
  await indice(s, T.verificaciones, "idx_nc_verif_nc", "nc_id");
  await s.execute(
    `CREATE TABLE IF NOT EXISTS ${T.acciones} (
      ${idCol()}, nc_id INT NOT NULL, descripcion ${tx} NOT NULL, responsable_id INT DEFAULT NULL, fecha_compromiso VARCHAR(10) DEFAULT NULL,
      estado VARCHAR(16) NOT NULL DEFAULT 'pendiente', creada_por INT DEFAULT NULL, creada_en VARCHAR(40) NOT NULL, iniciada_en VARCHAR(40) DEFAULT NULL,
      implementada_por INT DEFAULT NULL, implementada_en VARCHAR(40) DEFAULT NULL, descripcion_implementacion ${tx},
      cancelada_por INT DEFAULT NULL, cancelada_en VARCHAR(40) DEFAULT NULL, motivo_cancelacion ${tx},
      reasignada_en VARCHAR(40) DEFAULT NULL, motivo_reasignacion ${tx}
    )${fin()}`,
  );
  await indice(s, T.acciones, "idx_acciones_nc", "nc_id");
  await indice(s, T.acciones, "idx_acciones_responsable", "responsable_id");
  await s.execute(`CREATE TABLE IF NOT EXISTS ${T.comunicaciones} (${idCol()}, nc_id INT NOT NULL, fecha VARCHAR(10) NOT NULL, medio VARCHAR(20) NOT NULL, contacto VARCHAR(180) NOT NULL, resumen ${tx} NOT NULL, informe_ids_json ${tx}, registrado_por INT DEFAULT NULL, registrado_en VARCHAR(40) NOT NULL)${fin()}`);
  await indice(s, T.comunicaciones, "idx_nc_com_nc", "nc_id");
  await s.execute(
    `CREATE TABLE IF NOT EXISTS ${T.suspensiones} (
      ${idCol()}, tipo VARCHAR(10) NOT NULL, clave VARCHAR(40) NOT NULL, nc_id INT NOT NULL, motivo ${tx} NOT NULL,
      suspendida_por INT DEFAULT NULL, suspendida_rol VARCHAR(120) DEFAULT NULL, suspendida_en VARCHAR(40) NOT NULL, estado_previo_equipo VARCHAR(30) DEFAULT NULL,
      reanudada_por INT DEFAULT NULL, reanudada_rol VARCHAR(120) DEFAULT NULL, reanudada_en VARCHAR(40) DEFAULT NULL, motivo_reanudacion ${tx}, excepciones_json ${tx}
    )${fin()}`,
  );
  await indice(s, T.suspensiones, "idx_suspensiones_clave", "tipo, clave");
  await s.execute(
    `CREATE TABLE IF NOT EXISTS ${T.retenciones} (${idCol()}, nc_id INT NOT NULL, informe_id INT NOT NULL, motivo ${tx} NOT NULL, retenido_por INT DEFAULT NULL, retenido_rol VARCHAR(120) DEFAULT NULL, retenido_en VARCHAR(40) NOT NULL,
      liberada_por INT DEFAULT NULL, liberada_rol VARCHAR(120) DEFAULT NULL, liberada_en VARCHAR(40) DEFAULT NULL, motivo_liberacion ${tx})${fin()}`,
  );
  await indice(s, T.retenciones, "idx_retenciones_informe", "informe_id");
  // Responsables anteriores (JSON de ids): las reglas 8 y 9 tambien los cuentan.
  await addColumnIfMissing(s, T.nc, "responsables_previos", `${tx}`);
  await addColumnIfMissing(s, T.acciones, "responsables_previos", `${tx}`);
  // Propuesta de cambio documental ligada a la NC (Fase 7).
  if (await s.scalar(isSqlite() ? "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'propuestas_documento'" : "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'propuestas_documento'")) {
    await addColumnIfMissing(s, "propuestas_documento", "nc_id", "INT DEFAULT NULL");
  }
  markSchemaReady("calidad_fase11");
}

export const ahora = () => new Date().toISOString();

/* Lista JSON de ids de responsables anteriores (columna responsables_previos). */
export const previosDe = (row: Row | null | undefined): number[] => {
  try {
    const lista = JSON.parse(String(row?.responsables_previos || "[]"));
    return Array.isArray(lista) ? lista.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
  } catch {
    return [];
  }
};
export const conPrevio = (row: Row, anterior: unknown): string => JSON.stringify([...new Set([...previosDe(row), ...(anterior ? [Number(anterior)] : [])])]);

/* Fila con bloqueo en MySQL (transiciones de estado); en SQLite la sesion ya es exclusiva. */
export async function filaBloqueada(s: Session, tabla: string, id: number): Promise<Row | null> {
  return s.queryOne<Row>(`SELECT * FROM ${tabla} WHERE id = :id${isSqlite() ? "" : " FOR UPDATE"}`, { id });
}

export async function siguienteFolio(s: Session, tabla: string): Promise<number> {
  return Number((await s.scalar(`SELECT MAX(folio_num) FROM ${tabla}`)) || 0) + 1;
}

export function exigirTexto(valor: unknown, min: number, que: string): string {
  const t = String(valor ?? "").trim();
  if (t.length < min) throw new HttpError(400, { message: `${que} (al menos ${min} caracteres)` });
  return t;
}

/* ---------- Acceso ---------- */

export interface AccesoCalidad {
  auth: Autorizacion;
  yo: number;
  /* calidad:V con alcance total (ve todo). */
  total: boolean;
  puede: (accion: Accion) => boolean;
}

/*
 * Exige ver calidad (incidencias/NC). Con alcance "incidencias" solo lo propio;
 * el admin tecnico (V bitacora) y quien no tiene calidad reciben 403.
 */
export async function accesoCalidad(s: Session, user: CurrentUser, objeto: "incidencia" | "nc" | "accion_correctiva" = "incidencia"): Promise<AccesoCalidad> {
  await ensureCalidadSchema(s);
  const auth = await cargarAutorizacion(s, user);
  const permiso = permisoDe(auth, "calidad", "V", { objeto });
  if (!permiso) throw new HttpError(403, { message: "Permiso denegado para ver incidencias y no conformidades (calidad:V)", required: { module: "calidad", action: "V" } });
  return {
    auth,
    yo: userIdFromClaims(user) as number,
    total: permiso.alcances.includes("total"),
    puede: (accion: Accion) => !!permisoDe(auth, "calidad", accion, { objeto }),
  };
}

export async function exigirCalidad(s: Session, user: CurrentUser, accion: Accion, objeto: "incidencia" | "nc" | "accion_correctiva" = "nc", auth?: Autorizacion): Promise<Permiso> {
  await ensureCalidadSchema(s);
  return requirePermission(s, user, "calidad", accion, { objeto }, auth);
}

/* ¿Ve esta incidencia? Total, o la reporto la persona. */
export function veIncidencia(acc: AccesoCalidad, row: Row): boolean {
  return acc.total || Number(row.reportada_por) === acc.yo;
}

/* ¿Ve esta NC? Total, o es su responsable o responsable de alguna de sus acciones. */
export async function veNc(s: Session, acc: AccesoCalidad, row: Row): Promise<boolean> {
  if (acc.total || Number(row.responsable_id) === acc.yo) return true;
  return !!(await s.scalar(`SELECT id FROM ${T.acciones} WHERE nc_id = :nc AND responsable_id = :yo LIMIT 1`, { nc: row.id, yo: acc.yo }));
}

export async function incidenciaVisible(s: Session, acc: AccesoCalidad, id: number, bloquear = false): Promise<Row> {
  const row = bloquear ? await filaBloqueada(s, T.incidencias, id) : await s.queryOne<Row>(`SELECT * FROM ${T.incidencias} WHERE id = :id`, { id });
  // Lo ajeno responde igual que lo inexistente: no se revela que existe.
  if (!row || !veIncidencia(acc, row)) throw new HttpError(404, { message: "Incidencia no encontrada" });
  return row;
}

export async function ncVisible(s: Session, acc: AccesoCalidad, id: number, bloquear = false): Promise<Row> {
  const row = bloquear ? await filaBloqueada(s, T.nc, id) : await s.queryOne<Row>(`SELECT * FROM ${T.nc} WHERE id = :id`, { id });
  if (!row || !(await veNc(s, acc, row))) throw new HttpError(404, { message: "No conformidad no encontrada" });
  return row;
}

/* Persona activa y dentro de su vigencia (para responsables y verificadores). */
export async function personaVigente(s: Session, id: number | null | undefined): Promise<Row | null> {
  if (!id) return null;
  const row = await s.queryOne<Row>("SELECT id, nombre, email, activo, vigente_desde, vigente_hasta FROM usuarios WHERE id = :id", { id });
  if (!row) return null;
  const hoy = hoyLocal();
  const vigente = Number(row.activo) === 1 && (!row.vigente_desde || String(row.vigente_desde) <= hoy) && (!row.vigente_hasta || String(row.vigente_hasta) >= hoy);
  return { ...row, vigente };
}

/* Actor para la bitacora a partir de un id (incidencias automaticas reportadas por otra persona). */
export async function actorDe(s: Session, id: number | null | undefined): Promise<CurrentUser | null> {
  if (!id) return null;
  const row = await s.queryOne<Row>("SELECT id, nombre, email FROM usuarios WHERE id = :id", { id });
  return row ? ({ sub: String(row.id), nombre: String(row.nombre || ""), email: String(row.email || "") } as CurrentUser) : null;
}

/* CSV para exportar listas (celdas que empiezan con =, +, -, @ se neutralizan con '). */
export function respuestaCsv(nombre: string, encabezados: string[], filas: unknown[][]): Response {
  const celda = (v: unknown) => {
    const t = String(v ?? "");
    return `"${(/^[=+\-@\t\r]/.test(t) ? `'${t}` : t).replace(/"/g, '""')}"`;
  };
  const lineas = [encabezados.map(celda).join(","), ...filas.map((f) => f.map(celda).join(","))];
  return new Response(`﻿${lineas.join("\r\n")}\r\n`, { status: 200, headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${nombre}"`, "X-Content-Type-Options": "nosniff" } });
}
