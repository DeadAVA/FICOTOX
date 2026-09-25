import { ensureAuditSchema } from "./audit";
import { withSession } from "./db";
import { ensureAsignacionesSchema } from "./asignaciones";
import { ensureEnviosSchema } from "./envios";
import { ensureDocumentosFlujoSchema } from "./modules/documentos-flujo";
import { ensureAutorizacionesSchema, registrarVencimientosAutorizaciones } from "./autorizaciones";
import { ensureRbacSchema, migrarPermisosFase3, migrarRolesUnicos, registrarVencimientos } from "./rbac";
import { ensureSolicitudesSchema, vencerSolicitudes } from "./solicitudes";
import { ensureSeguridadSchema } from "./seguridad";
import { resetSchemaMemo } from "./schema";
import { ensureUsuariosSchema } from "./users";
import { ensureMovimientosSchema } from "./inventory-usage";
import { ensureConsumiblesSchema } from "./modules/consumables";
import { ensureDocumentosSgcSchema } from "./modules/documentos-sgc";
import { ensureReportesMantenimientoSchema } from "./modules/documents";
import { ensureInformesSchema } from "./modules/informes";
import { ensureEquiposSchema, ensureMantenimientosSchema, ensureReactivosSchema } from "./modules/inventory";
import { ensureAnalysisSchema } from "./modules/samples/analisis";
import { ensureSamplesRecepcionSchema } from "./modules/samples/recepcion";
import { ensureSamplesProcesamientoSchema } from "./modules/samples/procesamiento";
import { ensureSamplesExtraccionSchema } from "./modules/samples/extraccion";

/*
 * Equivalente al bloque de arranque create_app() del backend Flask original:
 * asegurar esquemas base y permisos, luego las tablas operativas por modulo,
 * y confirmar todo en una sola transaccion. Se ejecuta una vez por proceso,
 * antes del primer request; si falla se registra y se reintenta en el
 * siguiente request (Flask tampoco detiene el arranque).
 */

let initialSchemaPromise: Promise<void> | null = null;

export function ensureInitialSchema(): Promise<void> {
  if (!initialSchemaPromise) {
    initialSchemaPromise = withSession(async (s) => {
      await ensureRbacSchema(s);
      await ensureUsuariosSchema(s);
      await ensureAuditSchema(s);
      await ensureSeguridadSchema(s);
      await ensureSolicitudesSchema(s);
      await ensureAutorizacionesSchema(s);
      await ensureAsignacionesSchema(s);
      await ensureEnviosSchema(s);
      // Fase 1: usuarios.id_rol -> usuario_roles (una vez; queda en la bitacora).
      await migrarRolesUnicos(s);
      await migrarPermisosFase3(s);
      await ensureSamplesRecepcionSchema(s);
      await ensureSamplesProcesamientoSchema(s);
      await ensureSamplesExtraccionSchema(s);
      await ensureAnalysisSchema(s);
      await ensureInformesSchema(s);
      await ensureDocumentosSgcSchema(s);
      await ensureDocumentosFlujoSchema(s);
      await ensureReportesMantenimientoSchema(s);
      await ensureReactivosSchema(s);
      await ensureConsumiblesSchema(s);
      await ensureEquiposSchema(s);
      await ensureMantenimientosSchema(s);
      await ensureMovimientosSchema(s);
      await s.commit();
    }).catch((error: unknown) => {
      initialSchemaPromise = null;
      // El DDL quedo sin confirmar: se olvida lo memoizado para repetirlo.
      resetSchemaMemo();
      console.error("[bootstrap] No se pudieron asegurar los esquemas iniciales:", error);
    });
  }
  return initialSchemaPromise;
}

/*
 * Deja en la bitacora los roles cuya vigencia termino. Se ejecuta antes de
 * atender peticiones, como mucho una vez por minuto, en su propia transaccion.
 */
let ultimoBarrido = 0;
let barridoEnCurso: Promise<void> | null = null;

export function barrerVencimientos(): Promise<void> {
  if (barridoEnCurso) return barridoEnCurso;
  if (Date.now() - ultimoBarrido < 60_000) return Promise.resolve();
  ultimoBarrido = Date.now();
  barridoEnCurso = withSession(async (s) => {
    const vencidos = (await registrarVencimientos(s)) + (await vencerSolicitudes(s)) + (await registrarVencimientosAutorizaciones(s));
    if (vencidos) await s.commit();
  })
    .catch((error: unknown) => {
      ultimoBarrido = 0;
      console.error("[roles] No se pudieron registrar los vencimientos:", error);
    })
    .finally(() => {
      barridoEnCurso = null;
    });
  return barridoEnCurso;
}
