import { requireUser } from "../auth";
import { exigirVerRegistro } from "../acceso-registro";
import { advertenciaLlaveBitacora, origenLlaveBitacora, registrarAuditoria, verifyAuditChain } from "../audit";
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
/* Fase 11: incidencias, NC y acciones; sus datos solo con calidad:V total (el admin tecnico, V bitacora, no los ve). */
const ENTIDADES_CALIDAD = new Set(["incidencias", "no_conformidades", "acciones_correctivas", "suspensiones"]);
/* Acciones de calidad que se registran tambien sobre equipos e informes: su motivo es de la NC. */
const ACCIONES_CALIDAD = ["suspender", "reanudar", "retener", "liberar_retencion"];
const SQL_SENSIBLE_CALIDAD = `(entidad IN (${[...ENTIDADES_CALIDAD].map((e) => `'${e}'`).join(", ")}) OR accion IN (${ACCIONES_CALIDAD.map((a) => `'${a}'`).join(", ")}))`;

const calidadTotal = (auth: Autorizacion) => !!permisoDe(auth, "calidad", "V", { objeto: "incidencia" })?.alcances.includes("total");

/* Sin calidad:V total, el motivo de lo que viene de una NC (justificaciones, suspensiones, retenciones) no se entrega. */
function sinMotivoDeCalidad(item: Row, total: boolean): Row {
  if (total || !(ENTIDADES_CALIDAD.has(String(item.entidad || "")) || ACCIONES_CALIDAD.includes(String(item.accion || "")))) return item;
  return { ...item, motivo: null };
}

function datosVisibles(auth: Autorizacion, entidad: unknown): boolean {
  if (ENTIDADES_CALIDAD.has(String(entidad || ""))) return calidadTotal(auth);
  const modulo = ENTITY_MODULE[String(entidad || "")];
  if (!modulo) return true;
  const permiso = permisoDe(auth, modulo, "V");
  return !!permiso && !(modulo === "muestras" && soloEstado(permiso));
}

function recortar(item: Row, visible: boolean): Row {
  if (visible) return item;
  // En calidad tambien el motivo (justificaciones, descripciones de NC) queda restringido.
  return { ...item, cambios: {}, datos_anteriores: null, datos_nuevos: null, datos_restringidos: true, ...(ENTIDADES_CALIDAD.has(String(item.entidad || "")) ? { motivo: null } : {}) };
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
    hash_anterior: row.hash_anterior ?? null,
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
  incidencias: "calidad",
  no_conformidades: "calidad",
  acciones_correctivas: "calidad",
  suspensiones: "calidad",
};

/* Filas por archivo CSV de la bitacora (Fase 12): mas alla, exportacion por periodos. */
export const LIMITE_CSV = Number.parseInt(process.env.BITACORA_CSV_MAX_FILAS || "", 10) > 0 ? Number.parseInt(String(process.env.BITACORA_CSV_MAX_FILAS), 10) : 50_000;

export async function listAudit({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const entidad = searchParam(request, "entidad");
  const entidadId = searchParam(request, "entidad_id");
  // El historial de un registro concreto lo puede ver quien puede leer el modulo
  // al que pertenece; todo lo demas requiere el permiso de auditoria.
  const modulo = entidad && entidadId ? ENTITY_MODULE[entidad] : undefined;
  const auth = await cargarAutorizacion(s, user);
  // Fase 11: el historial de una incidencia o NC lo ve quien ve ese registro (con alcance "incidencias", solo lo propio).
  const historialCalidad = !!(entidad && entidadId && ENTIDADES_CALIDAD.has(entidad));
  // Fase 12: el historial de cualquier registro aplica los alcances de su ficha (asignado, autorizados, propio); lo no visible es 404.
  if (entidad && entidadId && modulo) await exigirVerRegistro(s, user, auth, entidad, entidadId);
  else await requirePermission(s, user, "calidad", "V", undefined, auth);
  const accion = searchParam(request, "accion");
  const usuario = searchParam(request, "usuario");
  const search = searchParam(request, "search");
  const desde = searchParam(request, "desde");
  const hasta = searchParam(request, "hasta");
  const csv = searchParam(request, "formato") === "csv";
  // Fase 12: el CSV llega hasta 50 000 filas por archivo; si hay mas, se avisa (en el archivo, en los encabezados y en la interfaz)
  // y se exporta por periodos (desde/hasta). Se pide una fila de mas para saber si se corto.
  const limit = Math.min(Math.max(Number.parseInt(searchParam(request, "limit") || (csv ? String(LIMITE_CSV) : "200"), 10) || 200, 1), csv ? LIMITE_CSV : 1000);
  // Fase 9: filtro por modulo (las entidades cuyo historial pertenece a ese modulo).
  const moduloFiltro = searchParam(request, "modulo");
  /*
   * Filtros de solo lectura para la vista de /auditoria (no cambian la bitacora):
   * `acciones` (lista separada por comas: categoria de acciones), `sin_accesos=1`
   * (oculta inicios de sesion y reautenticaciones; siguen en la bitacora y en el
   * CSV) y `antes_de` (id: pagina siguiente, del mas reciente al mas antiguo).
   */
  const accionesLista = searchParam(request, "acciones").split(",").map((a) => a.trim()).filter((a) => /^[a-z_]{2,40}$/.test(a)).slice(0, 60);
  const sinAccesos = !csv && searchParam(request, "sin_accesos") === "1";
  const antesDe = Number.parseInt(searchParam(request, "antes_de") || "0", 10) || 0;
  const entidadesModulo = moduloFiltro ? Object.entries(ENTITY_MODULE).filter(([, m]) => m === moduloFiltro).map(([e]) => e) : [];

  const rows = await s.query<Row>(
    `
    SELECT id, fecha_hora, usuario_id, usuario_nombre, usuario_email, accion, entidad, entidad_id,
           referencia, motivo, cambios_json, hash, hash_anterior
    FROM auditoria
    WHERE (:entidad = '' OR entidad = :entidad)
      AND (:entidad_id = '' OR entidad_id = :entidad_id)
      AND (:accion = '' OR accion = :accion)
      AND (:usuario = '' OR usuario_email LIKE :usuario_like OR usuario_nombre LIKE :usuario_like)
      AND (:search = '' OR referencia LIKE :search_like OR (motivo LIKE :search_like${calidadTotal(auth) || historialCalidad ? "" : ` AND NOT ${SQL_SENSIBLE_CALIDAD}`}))
      AND (:desde = '' OR fecha_hora >= :desde_ini)
      AND (:hasta = '' OR fecha_hora <= :hasta_fin)
      ${moduloFiltro ? `AND entidad IN (${entidadesModulo.map((e) => `'${e}'`).join(", ") || "''"})` : ""}
      ${accionesLista.length ? `AND accion IN (${accionesLista.map((_, i) => `:acc${i}`).join(", ")})` : ""}
      ${sinAccesos ? "AND accion NOT IN ('login', 'login_fallido', 'reauth_fallida', 'cerrar_sesiones')" : ""}
      ${antesDe ? "AND id < :antes_de" : ""}
    ORDER BY id DESC
    LIMIT ${limit + 1}
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
      antes_de: antesDe,
      ...Object.fromEntries(accionesLista.map((a, i) => [`acc${i}`, a])),
    },
  );
  const truncado = rows.length > limit;
  if (truncado) rows.length = limit;
  const total = calidadTotal(auth) || historialCalidad;
  const items = rows.map((row) => sinMotivoDeCalidad(recortar(serialize(row), historialCalidad || datosVisibles(auth, row.entidad)), total));
  if (csv) {
    // Fase 9: exportacion para auditoria, con los mismos filtros y alcances; queda en la bitacora.
    await registrarAuditoria(s, user, { accion: "exportar", entidad: entidad && entidadId ? entidad : "auditoria", entidadId: entidad && entidadId ? entidadId : null, referencia: entidad && entidadId ? `Historial ${AUDIT_ENTITIES[entidad] || entidad} #${entidadId}` : "Bitácora", detalle: { formato: "csv", filas: items.length, truncado, filtros: { entidad, entidad_id: entidadId, accion, usuario, search, desde, hasta, modulo: moduloFiltro } } });
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
    // Nunca se corta en silencio: la ultima fila lo dice y los encabezados lo informan a la interfaz.
    if (truncado) lineas.push([`AVISO: exportación PARCIAL, cortada en ${items.length} filas (hay más registros). Exporta por periodo con los filtros Desde/Hasta para obtener el resto.`].map(celda).join(","));
    return new Response(`\uFEFF${lineas.join("\r\n")}\r\n`, { status: 200, headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="bitacora-${hoyLocal()}${truncado ? "-parcial" : ""}.csv"`, "X-Bitacora-Filas": String(items.length), "X-Bitacora-Truncado": truncado ? "1" : "0", "Access-Control-Expose-Headers": "X-Bitacora-Filas, X-Bitacora-Truncado" } });
  }
  return json({ items, total: rows.length, truncado });
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
  const id = Number.parseInt(String(params.id || ""), 10);
  const row = await s.queryOne<Row>("SELECT * FROM auditoria WHERE id = :id", { id });
  if (!row) return json({ message: "Registro no encontrado" }, 404);
  const item = {
    ...serialize(row),
    hash_anterior: row.hash_anterior,
    datos_anteriores: safeJsonLoad(row.datos_anteriores_json, null),
    datos_nuevos: safeJsonLoad(row.datos_nuevos_json, null),
  };
  return json({ item: sinMotivoDeCalidad(recortar(item, datosVisibles(auth, row.entidad)), calidadTotal(auth)) });
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
