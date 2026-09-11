import type { CurrentUser } from "./auth";
import { registrarAuditoria, snapshotRow } from "./audit";
import { isIntegrityError, type Row, type Session } from "./db";
import { HttpError, readJson } from "./http";
import { consumeConsumible, consumeReactivo, restoreInventoryUsage } from "./inventory-usage";
import { addColumnIfMissing } from "./schema";

/*
 * Reglas comunes del flujo de muestras (ISO/IEC 17025 7.4, 7.5 y la
 * induccion PVVC): los registros tecnicos no se eliminan, se anulan con
 * motivo; no se avanza de etapa desde un registro anulado o rechazado; el
 * estado de la etapa anterior avanza solo cuando existe la siguiente.
 */

export type SampleTable = "muestras_recepcion" | "muestras_procesamiento" | "muestras_extraccion" | "muestras_analisis";

const FOLIO_PREFIX: Record<SampleTable, string> = {
  muestras_recepcion: "R",
  muestras_procesamiento: "P",
  muestras_extraccion: "E",
  muestras_analisis: "A",
};

const LABEL: Record<SampleTable, string> = {
  muestras_recepcion: "recepcion",
  muestras_procesamiento: "procesamiento",
  muestras_extraccion: "extraccion",
  muestras_analisis: "analisis",
};

/* Las tablas heredadas usan el femenino ("anulada"); el analisis, el masculino. */
export const ANULADO_VALUE: Record<SampleTable, string> = {
  muestras_recepcion: "anulada",
  muestras_procesamiento: "anulada",
  muestras_extraccion: "anulada",
  muestras_analisis: "anulado",
};

/* Estados desde los que ya no se edita ni se continua el flujo. */
const LOCKED_STATES: Record<SampleTable, Set<string>> = {
  muestras_recepcion: new Set(["anulada", "rechazada", "cerrada"]),
  muestras_procesamiento: new Set(["anulada"]),
  muestras_extraccion: new Set(["anulada"]),
  muestras_analisis: new Set(["anulado", "aprobado"]),
};

/* Etapa anterior de cada tabla (para validar el origen al restaurar). */
const PARENT: Partial<Record<SampleTable, { table: SampleTable; column: string }>> = {
  muestras_procesamiento: { table: "muestras_recepcion", column: "recepcion_id" },
  muestras_extraccion: { table: "muestras_procesamiento", column: "procesamiento_id" },
  muestras_analisis: { table: "muestras_extraccion", column: "extraccion_id" },
};

/* Orden del ciclo de vida: solo se avanza hacia adelante de forma automatica. */
const STATE_RANK: Record<string, number> = {
  registrada: 0,
  aceptada: 1,
  en_proceso: 2,
  completada: 3,
  analizada: 3,
  informada: 4,
  cerrada: 5,
};

/* Columnas de anulacion que comparten todas las tablas del flujo. */
export async function ensureAnulacionColumns(s: Session, table: string): Promise<void> {
  await addColumnIfMissing(s, table, "anulado_en", "VARCHAR(40) DEFAULT NULL");
  await addColumnIfMissing(s, table, "anulado_por", "INT DEFAULT NULL");
  await addColumnIfMissing(s, table, "motivo_anulacion", "TEXT");
  await addColumnIfMissing(s, table, "estado_previo", "VARCHAR(30) DEFAULT NULL");
}

export function folioLabel(table: SampleTable, row: Row | null | undefined): string {
  if (!row) return LABEL[table];
  const prefix = table === "muestras_extraccion" ? String(row.tipo_registro || "E-A") : FOLIO_PREFIX[table];
  return `${prefix} ${String(row.folio_num || 0).padStart(7, "0")}`;
}

export function isAnulado(table: SampleTable, row: Row | null | undefined): boolean {
  return !!row && String(row.estado || "") === ANULADO_VALUE[table];
}

/* Un registro anulado, rechazado, cerrado o aprobado no se edita. */
export function assertEditable(row: Row | null | undefined, table: SampleTable): void {
  if (!row) throw new HttpError(404, { message: "Registro no encontrado" });
  const estado = String(row.estado || "");
  if (isAnulado(table, row)) throw new HttpError(409, { message: `El registro ${folioLabel(table, row)} esta anulado y no se puede modificar` });
  if (LOCKED_STATES[table].has(estado)) {
    throw new HttpError(409, { message: `El registro ${folioLabel(table, row)} esta en estado "${estado}" y ya no se modifica; si hay un error, anulalo con motivo` });
  }
}

/* Antes de crear la siguiente etapa a partir de este registro (o de restaurar una que depende de el). */
export async function assertOrigin(s: Session, table: SampleTable, id: number | null | undefined, options: { requireAccepted?: boolean } = {}): Promise<Row | null> {
  if (!id) return null;
  const row = await snapshotRow(s, table, id);
  if (!row) throw new HttpError(404, { message: `No existe la ${LABEL[table]} de origen` });
  const estado = String(row.estado || "");
  if (isAnulado(table, row)) throw new HttpError(409, { message: `La ${LABEL[table]} ${folioLabel(table, row)} esta anulada; no se puede continuar a partir de ella` });
  if (estado === "rechazada") throw new HttpError(409, { message: `La ${LABEL[table]} ${folioLabel(table, row)} fue rechazada; no se puede continuar a partir de ella` });
  if (options.requireAccepted) {
    const decision = String(row.decision_aceptacion || "");
    if (!["aceptada", "aceptada_con_desviacion"].includes(decision)) {
      throw new HttpError(409, { message: `La recepcion ${folioLabel(table, row)} no tiene registrada la decision de aceptacion de la muestra` });
    }
  }
  return row;
}

/* Avanza el estado de la etapa anterior sin retroceder nunca. */
export async function advanceState(s: Session, table: SampleTable, id: number | null | undefined, estado: string): Promise<void> {
  if (!id) return;
  const row = await s.queryOne<{ estado: string }>(`SELECT estado FROM ${table} WHERE id = :id`, { id });
  if (!row) return;
  const current = String(row.estado || "");
  if (LOCKED_STATES[table].has(current)) return;
  if ((STATE_RANK[current] ?? 0) >= (STATE_RANK[estado] ?? 0)) return;
  await s.execute(`UPDATE ${table} SET estado = :estado WHERE id = :id`, { estado, id });
}

export async function readMotivo(request: Request): Promise<string> {
  const payload = await readJson(request);
  return String(payload.motivo || "").trim();
}

/*
 * Anulacion con motivo obligatorio. Repone el inventario descontado por el
 * registro (prefijo de referencia de movimientos) y deja auditoria.
 */
export async function anularRegistro(
  s: Session,
  user: CurrentUser,
  table: SampleTable,
  id: number,
  motivo: string,
  options: { movimientosPrefix?: string; bloqueaSi?: () => Promise<string | null> } = {},
): Promise<Row> {
  if (motivo.length < 5) throw new HttpError(400, { message: "Indica el motivo de la anulacion (al menos 5 caracteres)" });
  const antes = await snapshotRow(s, table, id);
  if (!antes) throw new HttpError(404, { message: "Registro no encontrado" });
  if (isAnulado(table, antes)) throw new HttpError(409, { message: "El registro ya esta anulado" });
  if (options.bloqueaSi) {
    const bloqueo = await options.bloqueaSi();
    if (bloqueo) throw new HttpError(409, { message: bloqueo });
  }
  const userId = Number.parseInt(String(user.sub || ""), 10) || null;
  await s.execute(
    `UPDATE ${table} SET estado_previo = :estado_previo, estado = :anulado, anulado_en = :anulado_en, anulado_por = :anulado_por, motivo_anulacion = :motivo WHERE id = :id`,
    { estado_previo: String(antes.estado || "registrada"), anulado: ANULADO_VALUE[table], anulado_en: new Date().toISOString(), anulado_por: userId, motivo, id },
  );
  let repuestos = 0;
  if (options.movimientosPrefix) {
    repuestos = await restoreInventoryUsage(s, options.movimientosPrefix);
  }
  const despues = await snapshotRow(s, table, id);
  await registrarAuditoria(s, user, {
    accion: "anular",
    entidad: table,
    entidadId: id,
    referencia: folioLabel(table, antes),
    motivo,
    antes,
    despues,
    detalle: repuestos ? { movimientos_repuestos: repuestos } : null,
  });
  return despues || antes;
}

/*
 * Restaurar un registro anulado (queda en auditoria con motivo). Exige que la
 * etapa de origen siga vigente. El inventario no se vuelve a descontar solo.
 */
export async function restaurarRegistro(s: Session, user: CurrentUser, table: SampleTable, id: number, motivo: string): Promise<Row> {
  if (motivo.length < 5) throw new HttpError(400, { message: "Indica el motivo de la restauracion (al menos 5 caracteres)" });
  const antes = await snapshotRow(s, table, id);
  if (!antes) throw new HttpError(404, { message: "Registro no encontrado" });
  if (!isAnulado(table, antes)) throw new HttpError(409, { message: "El registro no esta anulado" });
  const parent = PARENT[table];
  if (parent) {
    const parentId = Number(antes[parent.column] || 0) || null;
    if (parentId) await assertOrigin(s, parent.table, parentId, { requireAccepted: parent.table === "muestras_recepcion" });
  }
  const estado = String(antes.estado_previo || (table === "muestras_analisis" ? "registrado" : "registrada"));
  await s.execute(`UPDATE ${table} SET estado = :estado, estado_previo = NULL, anulado_en = NULL, anulado_por = NULL, motivo_anulacion = NULL WHERE id = :id`, { estado, id });
  const despues = await snapshotRow(s, table, id);
  await registrarAuditoria(s, user, { accion: "restaurar", entidad: table, entidadId: id, referencia: folioLabel(table, antes), motivo, antes, despues });
  return despues || antes;
}

/* Cantidad total por insumo (`tipo:ref`) que un registro ya tenia declarada. */
export function insumosDeclarados(usoInventarioJson: unknown): Map<string, number> {
  const totales = new Map<string, number>();
  try {
    const filas = JSON.parse(String(usoInventarioJson || "[]"));
    if (!Array.isArray(filas)) return totales;
    for (const fila of filas) {
      if (!fila || typeof fila !== "object" || Array.isArray(fila)) continue;
      const item = fila as Record<string, unknown>;
      const ref = item.ref || item.nombre || "";
      if (!ref) continue;
      const clave = `${String(item.tipo || "").trim().toLowerCase()}:${String(ref)}`;
      totales.set(clave, (totales.get(clave) || 0) + (Number(item.cantidad) || 0));
    }
  } catch {
    /* JSON invalido: sin insumos previos */
  }
  return totales;
}

/* Los registros tecnicos no se eliminan (FX-MC 7.5.2). */
export function deletionNotAllowed(): never {
  throw new HttpError(405, { message: "Los registros tecnicos no se eliminan: anule el registro indicando el motivo" });
}

/* ---------- Folios ---------- */

/* Siguiente folio de una serie (opcionalmente acotada, p. ej. por tipo de extraccion). */
export async function nextFolioNum(s: Session, table: SampleTable | "informes", where = "", params: Record<string, unknown> = {}): Promise<number> {
  const max = await s.scalar(`SELECT MAX(folio_num) FROM ${table}${where ? ` WHERE ${where}` : ""}`, params);
  return (Number.parseInt(String(max ?? 0), 10) || 0) + 1;
}

/* Violacion de unicidad del folio (indice uq_*_folio_num o restriccion sobre folio_num). */
export function isFolioConflict(error: unknown): boolean {
  const message = String((error as { message?: unknown })?.message || "");
  return isIntegrityError(error) && /folio/i.test(message);
}

/* ---------- Inventario de una etapa ---------- */

/*
 * Descuenta los insumos declarados en `uso_inventario_json` con referencias
 * `<prefijo>-<id>-INS-<n>`, para que la anulacion o la reedicion puedan
 * reponerlos por prefijo (restoreInventoryUsage).
 */
export async function applyStageInventory(
  s: Session,
  prefix: string,
  id: number,
  usoInventarioJson: string | null | undefined,
  motivo: string,
  userId: number | null,
  /* Cantidad por insumo (`tipo:ref`) que el registro ya declaraba antes de esta edicion. */
  declaradosAntes: Map<string, number> = new Map(),
): Promise<void> {
  let insumos: unknown = [];
  try {
    insumos = JSON.parse(String(usoInventarioJson || "[]"));
  } catch {
    return;
  }
  if (!Array.isArray(insumos)) return;
  // Un insumo dado de baja se puede reponer hasta la cantidad que el registro ya
  // declaraba, pero no consumir mas existencias de un articulo retirado.
  const solicitado = new Map<string, number>();
  for (const fila of insumos) {
    if (!fila || typeof fila !== "object" || Array.isArray(fila)) continue;
    const item = fila as Record<string, unknown>;
    const ref = item.ref || item.nombre || "";
    if (!ref) continue;
    const clave = `${String(item.tipo || "").trim().toLowerCase()}:${String(ref)}`;
    solicitado.set(clave, (solicitado.get(clave) || 0) + (Number(item.cantidad) || 1));
  }
  for (let idx = 0; idx < insumos.length; idx += 1) {
    const insumo = insumos[idx];
    if (!insumo || typeof insumo !== "object" || Array.isArray(insumo)) continue;
    const item = insumo as Record<string, unknown>;
    const tipo = String(item.tipo || "").trim().toLowerCase();
    const ref = item.ref || item.nombre || "";
    if (!ref) continue;
    const clave = `${tipo}:${String(ref)}`;
    const previo = declaradosAntes.get(clave);
    const options = { userId, motivo, referencia: `${prefix}-${id}-INS-${idx}`, permitirInactivo: previo !== undefined && (solicitado.get(clave) || 0) <= previo + 1e-9 };
    if (tipo === "reactivo") await consumeReactivo(s, ref, item.cantidad || 1, options);
    else if (tipo === "consumible") await consumeConsumible(s, ref, item.cantidad || 1, options);
  }
}
