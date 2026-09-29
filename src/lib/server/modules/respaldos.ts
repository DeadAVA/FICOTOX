/*
 * Respaldos (Fase 10; FX-MO-2-1 seccion 9: "El Administrador tecnico ejecutara
 * respaldos y pruebas de recuperacion"). Pantalla Administracion > Respaldos.
 *
 * - Ver: usuarios:G (Administrador tecnico) o calidad:V (Mejora Continua,
 *   Auditor, Responsable General...) en solo lectura.
 * - "Crear respaldo ahora": usuarios:G con reautenticacion; queda en la bitacora.
 * - La restauracion NO se ejecuta desde aqui: solo por linea de comandos con el
 *   servidor detenido (scripts/restaurar-ficotox.mjs); la pantalla la explica.
 * - Una sola implementacion del respaldo: src/lib/shared/respaldo.mjs.
 */
import { registrarIncidenciaAutomatica } from "./calidad/automaticas";
import fs from "node:fs";
import path from "node:path";
import { requireUser } from "../auth";
import { registrarAuditoria } from "../audit";
import { getConfig } from "../config";
import { HttpError, json, type RouteContext } from "../http";
import { cargarAutorizacion, permisoDe, requirePermission, type Autorizacion } from "../rbac";
import { exigirReauth } from "../seguridad";
import { aplicarRetencion, CARPETA_ACTAS, crearRespaldo, listarActas, listarRespaldos } from "../../shared/respaldo.mjs";
import { formatearFechaHora } from "../../shared/fechas";

const ACTA_RE = /^\d{8}-\d{6}(-\d+)?$/;

export const puedeVerRespaldos = (auth: Autorizacion): boolean => !!(permisoDe(auth, "usuarios", "G") || permisoDe(auth, "calidad", "V"));
/* A quien le llegan los avisos: quien respalda (usuarios:G) y quien revisa (calidad:A, Mejora Continua / Responsable General). */
export const recibeAvisosRespaldo = (auth: Autorizacion): boolean => !!(permisoDe(auth, "usuarios", "G") || permisoDe(auth, "calidad", "A"));

async function exigirVer(request: Request, s: RouteContext["s"]): Promise<Autorizacion> {
  const auth = await cargarAutorizacion(s, await requireUser(request));
  if (!puedeVerRespaldos(auth)) throw new HttpError(403, { message: "Permiso denegado para ver los respaldos (usuarios:G o calidad:V)", required: { module: "calidad", action: "V" } });
  return auth;
}

export interface AvisoRespaldo {
  tipo: "sin_respaldo" | "sin_prueba";
  titulo: string;
  detalle: string;
}

/* Avisos: sin respaldo en las ultimas RESPALDO_AVISO_HORAS o sin prueba de restauracion aprobada en PRUEBA_RESTAURACION_AVISO_DIAS. */
export function avisosRespaldo(): AvisoRespaldo[] {
  const cfg = getConfig();
  const out: AvisoRespaldo[] = [];
  const respaldos = listarRespaldos(cfg.RESPALDOS_DIR);
  const ultimo = respaldos[0];
  if (!ultimo || Date.now() - Date.parse(ultimo.creado_en) > cfg.RESPALDO_AVISO_HORAS * 3_600_000) {
    out.push({ tipo: "sin_respaldo", titulo: `Sin respaldo en las últimas ${cfg.RESPALDO_AVISO_HORAS} h`, detalle: ultimo ? `Último: ${formatearFechaHora(ultimo.creado_en)}` : "Aún no hay respaldos locales" });
  }
  const prueba = listarActas(cfg.RESPALDOS_DIR).find((a) => a.resultado === "aprobada");
  if (!prueba || Date.now() - Date.parse(prueba.fecha) > cfg.PRUEBA_RESTAURACION_AVISO_DIAS * 86_400_000) {
    out.push({ tipo: "sin_prueba", titulo: `Sin prueba de restauración en ${cfg.PRUEBA_RESTAURACION_AVISO_DIAS} días`, detalle: prueba ? `Última aprobada: ${formatearFechaHora(prueba.fecha)}` : "Aún no hay una prueba de restauración aprobada" });
  }
  return out;
}

/*
 * Fase 11: un acta cuya verificacion 1 (integridad de los archivos del respaldo)
 * fallo es una alerta de integridad del respaldo: queda en la bitacora y crea una
 * incidencia automatica (reportada por el sistema, una por acta).
 */
async function alertasDeRespaldo(s: RouteContext["s"]): Promise<boolean> {
  let nuevas = false;
  for (const acta of listarActas(getConfig().RESPALDOS_DIR).slice(0, 50)) {
    const v1 = (acta.verificaciones as Array<{ n: number; ok: boolean; detalle?: string }> | undefined)?.find((v) => v.n === 1);
    if (!v1 || v1.ok) continue;
    const id = await registrarIncidenciaAutomatica(s, {
      origen: "alerta_integridad",
      clave: `alerta_integridad:respaldo:${acta.archivo}`,
      tipo: "sistema",
      descripcion: `La prueba de restauración del ${formatearFechaHora(acta.fecha)} detectó que el respaldo ${acta.respaldo_id} no es íntegro (verificación 1): ${String(v1.detalle || "").slice(0, 300)}`,
      impacto: "desconocido",
      actor: null,
      registros: [],
    });
    if (id) {
      await registrarAuditoria(s, null, { accion: "alerta_integridad", entidad: "respaldos", entidadId: acta.respaldo_id, referencia: acta.respaldo_id, detalle: { acta: acta.archivo, verificacion: 1, detalle: String(v1.detalle || "").slice(0, 300) } });
      nuevas = true;
    }
  }
  return nuevas;
}

/* GET /api/respaldos */
export async function listarRespaldosApi({ request, s }: RouteContext): Promise<Response> {
  const auth = await exigirVer(request, s);
  if (await alertasDeRespaldo(s)) await s.commit();
  const cfg = getConfig();
  const respaldos = listarRespaldos(cfg.RESPALDOS_DIR).map(({ carpeta: _carpeta, ...r }) => (void _carpeta, r));
  const actas = listarActas(cfg.RESPALDOS_DIR).slice(0, 20).map((a) => ({ archivo: a.archivo, fecha: a.fecha, respaldo_id: a.respaldo_id, responsable: a.responsable, modo: a.modo, resultado: a.resultado, duracion_ms: a.duracion_ms }));
  return json({
    respaldos,
    actas,
    ultima_prueba: actas[0] || null,
    avisos: avisosRespaldo(),
    puede_crear: !!permisoDe(auth, "usuarios", "G"),
    motor: cfg.SQLITE_PATH ? "sqlite" : "mysql",
    retencion: cfg.RESPALDO_RETENCION,
    aviso_horas: cfg.RESPALDO_AVISO_HORAS,
    prueba_dias: cfg.PRUEBA_RESTAURACION_AVISO_DIAS,
  });
}

/* POST /api/respaldos: crear respaldo ahora (usuarios:G + reautenticacion respaldos:crear). */
export async function crearRespaldoApi({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "usuarios", "G");
  await exigirReauth(s, request, user, "respaldos:crear");
  const cfg = getConfig();
  if (!cfg.SQLITE_PATH) throw new HttpError(501, { message: "Esta instalación usa MySQL/MariaDB: el respaldo se hace con mysqldump (ver docs/RESPALDO_Y_RECUPERACION.md)", codigo: "respaldo_mysql" });
  // better-sqlite3 es un modulo nativo externo (serverExternalPackages); lo recibe respaldo.mjs.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sqlite = require("better-sqlite3");
  const { id, manifest } = await crearRespaldo({ Sqlite, sqlitePath: cfg.SQLITE_PATH, instanceDir: cfg.INSTANCE_DIR, respaldosDir: cfg.RESPALDOS_DIR, secretKey: process.env.SECRET_KEY || "", baseDir: cfg.BASE_DIR, incluirLlave: true });
  const eliminados = aplicarRetencion(cfg.RESPALDOS_DIR, cfg.RESPALDO_RETENCION);
  const tamano = manifest.base.tamano + manifest.archivos.reduce((t, a) => t + a.tamano, 0);
  await registrarAuditoria(s, user, {
    accion: "respaldar",
    entidad: "respaldos",
    entidadId: id,
    referencia: id,
    detalle: { respaldo_id: id, archivos: manifest.archivos.length, tamano, incluye_llave: manifest.llave.incluida, llave_huella: manifest.llave.huella ? `${manifest.llave.huella.slice(0, 12)}…` : null, bitacora_ultimo_id: manifest.bitacora.ultimo_id, ...(eliminados.length ? { retencion_eliminados: eliminados.join(", ") } : {}) },
  });
  await s.commit();
  return json({ message: `Respaldo ${id} creado`, id, archivos: manifest.archivos.length, incluye_llave: manifest.llave.incluida, eliminados }, 201);
}

/* GET /api/respaldos/actas/:nombre (?formato=json): el acta de una prueba de restauracion. */
export async function descargarActa({ request, s, params }: RouteContext): Promise<Response> {
  await exigirVer(request, s);
  const nombre = String(params.nombre || "");
  if (!ACTA_RE.test(nombre)) throw new HttpError(404, { message: "Acta no encontrada" });
  const formato = new URL(request.url).searchParams.get("formato") === "json" ? "json" : "md";
  const ruta = path.join(/*turbopackIgnore: true*/ getConfig().RESPALDOS_DIR, CARPETA_ACTAS, `${nombre}.${formato}`);
  if (!fs.existsSync(ruta)) throw new HttpError(404, { message: "Acta no encontrada" });
  const contenido = await fs.promises.readFile(ruta);
  return new Response(new Uint8Array(contenido), {
    status: 200,
    headers: {
      "Content-Type": formato === "json" ? "application/json; charset=utf-8" : "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="acta-restauracion-${nombre}.${formato}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
