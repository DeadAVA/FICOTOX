/*
 * Respaldos (Fase 10). La pantalla Administracion › Respaldos se retiro: los
 * respaldos y las pruebas de restauracion se hacen solo por linea de comandos
 * (npm run respaldar, npm run restaurar, la tarea programada) y su estado se
 * revisa con npm run verificar-instalacion. Una sola implementacion del
 * respaldo: src/lib/shared/respaldo.mjs (sin cambios).
 *
 * Queda aqui la alerta de integridad de las actas (Fase 11), que ahora se
 * revisa junto con la verificacion de la bitacora (al abrir Auditoria).
 */
import { registrarIncidenciaAutomatica } from "./calidad/automaticas";
import { registrarAuditoria } from "../audit";
import { getConfig } from "../config";
import { type RouteContext } from "../http";
import { listarActas } from "../../shared/respaldo.mjs";
import { formatearFechaHora } from "../../shared/fechas";

/*
 * Fase 11: un acta cuya verificacion 1 (integridad de los archivos del respaldo)
 * fallo es una alerta de integridad del respaldo: queda en la bitacora y crea una
 * incidencia automatica (reportada por el sistema, una por acta).
 */
export async function alertasDeRespaldo(s: RouteContext["s"]): Promise<boolean> {
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
