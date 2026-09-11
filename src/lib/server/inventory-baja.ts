import { userIdFromClaims, type CurrentUser } from "./auth";
import { registrarAuditoria, snapshotRow } from "./audit";
import type { Session } from "./db";
import { json } from "./http";
import { addColumnIfMissing } from "./schema";

/*
 * Baja logica de los catalogos de inventario (reactivos, consumibles,
 * equipos): un articulo dado de baja deja de ofrecerse en los formatos, pero
 * sus movimientos y los registros tecnicos que lo citan siguen apuntando a
 * el. Se registra motivo, fecha y usuario, y queda en la bitacora.
 */

export type BajaTable = "reactivos" | "consumibles" | "equipos";

export async function ensureBajaColumns(s: Session, table: BajaTable): Promise<void> {
  await addColumnIfMissing(s, table, "activo", "TINYINT(1) NOT NULL DEFAULT 1");
  await addColumnIfMissing(s, table, "baja_motivo", "TEXT");
  await addColumnIfMissing(s, table, "baja_en", "VARCHAR(40) DEFAULT NULL");
  await addColumnIfMissing(s, table, "baja_por", "INT DEFAULT NULL");
}

export function itemRef(table: BajaTable, row: Record<string, unknown> | null | undefined): string {
  if (!row) return table;
  if (table === "reactivos") return String(row.id_interno || row.nombre || row.producto || row.item_name || row.nombre_crm || row.id || "reactivo").slice(0, 160);
  return String(row.nombre || row.producto || row.id || table).slice(0, 160);
}

export async function darDeBaja(s: Session, user: CurrentUser, table: BajaTable, id: number, payload: Record<string, unknown>, label: string): Promise<Response> {
  const motivo = String(payload.motivo || "").trim();
  if (motivo.length < 5) {
    return json({ message: `Indica el motivo de la baja del ${label.toLowerCase()} (al menos 5 caracteres)` }, 400);
  }
  const antes = await snapshotRow(s, table, id);
  if (!antes) return json({ message: `${label} no encontrado` }, 404);
  if (Number(antes.activo ?? 1) === 0) return json({ message: `${label} ya esta dado de baja` }, 409);
  await s.execute(`UPDATE ${table} SET activo = 0, baja_motivo = :motivo, baja_en = :fecha, baja_por = :usuario WHERE id = :id`, { motivo, fecha: new Date().toISOString(), usuario: userIdFromClaims(user), id });
  const despues = await snapshotRow(s, table, id);
  await registrarAuditoria(s, user, { accion: "baja", entidad: table, entidadId: id, referencia: itemRef(table, antes), motivo, antes, despues });
  await s.commit();
  return json({ message: `${label} dado de baja` });
}

export async function reactivarItem(s: Session, user: CurrentUser, table: BajaTable, id: number, payload: Record<string, unknown>, label: string): Promise<Response> {
  const motivo = String(payload.motivo || "").trim();
  if (motivo.length < 5) return json({ message: "Indica el motivo de la reactivacion (al menos 5 caracteres)" }, 400);
  const antes = await snapshotRow(s, table, id);
  if (!antes) return json({ message: `${label} no encontrado` }, 404);
  if (Number(antes.activo ?? 1) === 1) return json({ message: `${label} ya esta activo` }, 409);
  await s.execute(`UPDATE ${table} SET activo = 1, baja_motivo = NULL, baja_en = NULL, baja_por = NULL WHERE id = :id`, { id });
  const despues = await snapshotRow(s, table, id);
  await registrarAuditoria(s, user, { accion: "reactivar", entidad: table, entidadId: id, referencia: itemRef(table, antes), motivo, antes, despues });
  await s.commit();
  return json({ message: `${label} reactivado` });
}
