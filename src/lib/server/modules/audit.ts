import { requireUser } from "../auth";
import { advertenciaLlaveBitacora, ensureAuditSchema, origenLlaveBitacora, registrarAuditoria, verifyAuditChain } from "../audit";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "../../shared/sgc";
import { formatearFechaHora, hoyLocal } from "../../shared/fechas";
import { type Row } from "../db";
import { json, type RouteContext } from "../http";
import { cargarAutorizacion, finDiaLocal, inicioDiaLocal, permisoDe, requirePermission, soloEstado, type Autorizacion } from "../rbac";
import type { Modulo } from "../../shared/permisos";
import { safeJsonLoad, searchParam } from "./helpers";

/*
 * Consulta de la bitacora de auditoria. Solo lectura: no existe endpoint
 * para modificar ni borrar entradas.
 */

/*
 * La bitacora muestra a quien la consulta que paso, quien y cuando; los datos
 * (antes, despues y cambios) de una entrada solo si puede ver el modulo del
 * registro y, en muestras, si su alcance no es solo "estado" (Fase 1). Asi el
 * alcance de un modulo no se elude leyendo la bitacora.
 */
function datosVisibles(auth: Autorizacion, entidad: unknown): boolean {
  const modulo = ENTITY_MODULE[String(entidad || "")];
  if (!modulo) return true;
  const permiso = permisoDe(auth, modulo, "V");
  return !!permiso && !(modulo === "muestras" && soloEstado(permiso));
}

function recortar(item: Row, visible: boolean): Row {
  if (visible) return item;
  return { ...item, cambios: {}, datos_anteriores: null, datos_nuevos: null, datos_restringidos: true };
}

function serialize(row: Row): Row {
  return {
    id: row.id,
    fecha_hora: row.fecha_hora,
    usuario_id: row.usuario_id,
    usuario_nombre: row.usuario_nombre,
    usuario_email: row.usuario_email,
    accion: row.accion,
    entidad: row.entidad,
    entidad_id: row.entidad_id,
    referencia: row.referencia,
    motivo: row.motivo,
    cambios: safeJsonLoad(row.cambios_json, {}),
    hash: row.hash,
  };
}

/* Modulo cuyo permiso de lectura da acceso al historial de cada entidad. */
const ENTITY_MODULE: Record<string, Modulo> = {
  muestras_recepcion: "muestras",
  muestras_procesamiento: "ensayos",
  muestras_extraccion: "ensayos",
  muestras_analisis: "ensayos",
  informes: "informes",
  documentos_sgc: "documentos",
  reportes_mantenimiento: "equipos",
  reactivos: "inventario",
  consumibles: "inventario",
  equipos: "equipos",
  mantenimientos: "equipos",
  usuarios: "usuarios",
  roles: "usuarios",
};

export async function listAudit({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await ensureAuditSchema(s);
  const entidad = searchParam(request, "entidad");
  const entidadId = searchParam(request, "entidad_id");
  // El historial de un registro concreto lo puede ver quien puede leer el modulo
  // al que pertenece; todo lo demas requiere el permiso de auditoria.
  const modulo = entidad && entidadId ? ENTITY_MODULE[entidad] : undefined;
  const auth = await cargarAutorizacion(s, user);
  await requirePermission(s, user, modulo || "calidad", "V", undefined, auth);
  const accion = searchParam(request, "accion");
  const usuario = searchParam(request, "usuario");
  const search = searchParam(request, "search");
  const desde = searchParam(request, "desde");
  const hasta = searchParam(request, "hasta");
  const csv = searchParam(request, "formato") === "csv";
  const limit = Math.min(Math.max(Number.parseInt(searchParam(request, "limit") || (csv ? "5000" : "200"), 10) || 200, 1), csv ? 20000 : 1000);
  // Fase 9: filtro por modulo (las entidades cuyo historial pertenece a ese modulo).
  const moduloFiltro = searchParam(request, "modulo");
  const entidadesModulo = moduloFiltro ? Object.entries(ENTITY_MODULE).filter(([, m]) => m === moduloFiltro).map(([e]) => e) : [];

  const rows = await s.query<Row>(
    `
    SELECT id, fecha_hora, usuario_id, usuario_nombre, usuario_email, accion, entidad, entidad_id,
           referencia, motivo, cambios_json, hash
    FROM auditoria
    WHERE (:entidad = '' OR entidad = :entidad)
      AND (:entidad_id = '' OR entidad_id = :entidad_id)
      AND (:accion = '' OR accion = :accion)
      AND (:usuario = '' OR usuario_email LIKE :usuario_like OR usuario_nombre LIKE :usuario_like)
      AND (:search = '' OR referencia LIKE :search_like OR motivo LIKE :search_like)
      AND (:desde = '' OR fecha_hora >= :desde_ini)
      AND (:hasta = '' OR fecha_hora <= :hasta_fin)
      ${moduloFiltro ? `AND entidad IN (${entidadesModulo.map((e) => `'${e}'`).join(", ") || "''"})` : ""}
    ORDER BY id DESC
    LIMIT ${limit}
    `,
    {
      entidad,
      entidad_id: entidadId,
      accion,
      usuario,
      usuario_like: `%${usuario}%`,
      search,
      search_like: `%${search}%`,
      desde,
      desde_ini: /^\d{4}-\d{2}-\d{2}$/.test(desde) ? inicioDiaLocal(desde) : desde,
      hasta,
      hasta_fin: /^\d{4}-\d{2}-\d{2}$/.test(hasta) ? finDiaLocal(hasta) : hasta ? `${hasta}T23:59:59.999Z` : "",
    },
  );
  const items = rows.map((row) => recortar(serialize(row), datosVisibles(auth, row.entidad)));
  if (csv) {
    // Fase 9: exportacion para auditoria, con los mismos filtros y alcances; queda en la bitacora.
    await registrarAuditoria(s, user, { accion: "exportar", entidad: entidad && entidadId ? entidad : "auditoria", entidadId: entidad && entidadId ? entidadId : null, referencia: entidad && entidadId ? `Historial ${AUDIT_ENTITIES[entidad] || entidad} #${entidadId}` : "Bitácora", detalle: { formato: "csv", filas: items.length, filtros: { entidad, entidad_id: entidadId, accion, usuario, search, desde, hasta, modulo: moduloFiltro } } });
    await s.commit();
    // Una celda que empieza con =, +, -, @, tab o retorno se neutraliza con ' (inyeccion de formulas en hojas de calculo).
    const celda = (v: unknown) => {
      const texto = String(v ?? "");
      return `"${(/^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto).replace(/"/g, '""')}"`;
    };
    const lineas = [["Fecha y hora", "Usuario", "Correo", "Acción", "Módulo", "Registro", "Referencia", "Motivo", "Cambios"].map(celda).join(",")];
    for (const item of items) {
      const entidadItem = String(item.entidad || "");
      lineas.push([formatearFechaHora(item.fecha_hora), item.usuario_nombre || "sistema", item.usuario_email, AUDIT_ACTIONS[String(item.accion)] || item.accion, ENTITY_MODULE[entidadItem] || AUDIT_ENTITIES[entidadItem] || entidadItem, `${AUDIT_ENTITIES[entidadItem] || entidadItem}${item.entidad_id ? ` #${item.entidad_id}` : ""}`, item.referencia, item.motivo, item.datos_restringidos ? "(datos restringidos por tu alcance)" : cambiosLegibles(item.cambios)].map(celda).join(","));
    }
    return new Response(`\uFEFF${lineas.join("\r\n")}\r\n`, { status: 200, headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="bitacora-${hoyLocal()}.csv"` } });
  }
  return json({ items, total: rows.length });
}

/* Cambios en texto legible: "campo: antes → despues; ..." y el detalle como "clave=valor". */
function cambiosLegibles(cambios: unknown): string {
  if (!cambios || typeof cambios !== "object") return "";
  const texto = (v: unknown): string => (v === null || v === undefined || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v).slice(0, 120) : String(v).slice(0, 120));
  const partes: string[] = [];
  for (const [campo, valor] of Object.entries(cambios as Record<string, unknown>)) {
    if (campo === "_detalle" && valor && typeof valor === "object") {
      for (const [k, v] of Object.entries(valor as Record<string, unknown>)) partes.push(`${k}=${texto(v)}`);
    } else if (valor && typeof valor === "object" && ("antes" in (valor as object) || "despues" in (valor as object))) {
      const par = valor as { antes?: unknown; despues?: unknown };
      partes.push(`${campo}: ${texto(par.antes)} → ${texto(par.despues)}`);
    } else partes.push(`${campo}: ${texto(valor)}`);
  }
  return partes.join("; ");
}

export async function getAuditEntry({ request, s, params }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const auth = await cargarAutorizacion(s, user);
  await requirePermission(s, user, "calidad", "V", undefined, auth);
  await ensureAuditSchema(s);
  const id = Number.parseInt(String(params.id || ""), 10);
  const row = await s.queryOne<Row>("SELECT * FROM auditoria WHERE id = :id", { id });
  if (!row) return json({ message: "Registro no encontrado" }, 404);
  const item = {
    ...serialize(row),
    hash_anterior: row.hash_anterior,
    datos_anteriores: safeJsonLoad(row.datos_anteriores_json, null),
    datos_nuevos: safeJsonLoad(row.datos_nuevos_json, null),
  };
  return json({ item: recortar(item, datosVisibles(auth, row.entidad)) });
}

/* Integridad de la cadena de hashes (ISO/IEC 17025 7.11.3). */
export async function verifyAudit({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "calidad", "V");
  // Origen de la llave (nunca la llave) y advertencias para /auditoria.
  return json({ ...(await verifyAuditChain(s)), llave: { origen: origenLlaveBitacora(), advertencias: advertenciaLlaveBitacora() } });
}

export async function auditSummary({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "calidad", "V");
  await ensureAuditSchema(s);
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const summary = await s.queryOne(
    `
    SELECT
      (SELECT COUNT(*) FROM auditoria) AS total,
      (SELECT COUNT(*) FROM auditoria WHERE fecha_hora >= :since) AS ultimos_30_dias,
      (SELECT COUNT(*) FROM auditoria WHERE accion = 'anular') AS anulaciones,
      (SELECT COUNT(*) FROM auditoria WHERE accion = 'login_fallido' AND fecha_hora >= :since) AS accesos_fallidos_30_dias
    `,
    { since },
  );
  return json(summary || {});
}
