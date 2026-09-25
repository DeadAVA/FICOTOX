/*
 * Acciones criticas que requieren la aprobacion de un segundo usuario
 * (Fase 3; "Roles y permisos FICOTOX", seccion 10). Catalogo versionado.
 *
 * Al pedir una de estas acciones NO se ejecuta: se crea una solicitud de
 * autorizacion (tabla solicitudes_autorizacion) y la ejecuta el servidor cuando
 * un segundo usuario, distinto del solicitante y con el permiso indicado, la
 * aprueba. Todo lo que no esta aqui sigue como hoy (una persona con
 * reautenticacion). Revocar roles, dar de baja cuentas y bloquear NO requieren
 * segundo usuario: reducir privilegios no debe esperar.
 */
import type { Accion, Modulo } from "./permisos";

export const VERSION_ACCIONES_CRITICAS = "2026-09-24.1";

export type TipoSolicitud = "anular_registro" | "restaurar_registro" | "anular_informe" | "excepcion_segregacion" | "asignar_rol" | "reactivar_cuenta" | "ampliar_vigencia";

export type EstadoSolicitud = "pendiente" | "aprobada" | "rechazada" | "cancelada" | "vencida";

export interface AccionCritica {
  tipo: TipoSolicitud;
  etiqueta: string;
  /* Frase para el registro mientras esta pendiente: "Anulación solicitada". */
  pendiente: string;
  /* Permiso del segundo usuario. `modulo` fijo o "mismo" (el del registro). */
  aprueba: { modulo: Modulo | "mismo"; accion: Accion };
  descripcion: string;
}

export const ACCIONES_CRITICAS: Record<TipoSolicitud, AccionCritica> = {
  anular_registro: { tipo: "anular_registro", etiqueta: "Anular registro", pendiente: "Anulación solicitada", aprueba: { modulo: "mismo", accion: "AN" }, descripcion: "Anular una recepción, procesamiento, extracción o análisis que ya no está en borrador/registrado (incluye el análisis aprobado)." },
  restaurar_registro: { tipo: "restaurar_registro", etiqueta: "Restaurar registro", pendiente: "Restauración solicitada", aprueba: { modulo: "mismo", accion: "AN" }, descripcion: "Restaurar un registro anulado que antes de anularse ya no estaba en borrador/registrado." },
  anular_informe: { tipo: "anular_informe", etiqueta: "Anular informe", pendiente: "Anulación solicitada", aprueba: { modulo: "informes", accion: "AN" }, descripcion: "Anular un informe autorizado o entregado." },
  excepcion_segregacion: { tipo: "excepcion_segregacion", etiqueta: "Excepción de segregación", pendiente: "Excepción solicitada", aprueba: { modulo: "calidad", accion: "A" }, descripcion: "Una persona pide revisar, aprobar o autorizar lo que elaboró, por falta de personal. La aprueba quien tiene A en calidad (Responsable General / Mejora Continua)." },
  asignar_rol: { tipo: "asignar_rol", etiqueta: "Asignar rol", pendiente: "Asignación de rol solicitada", aprueba: { modulo: "usuarios", accion: "A" }, descripcion: "Asignar un rol a un usuario (también el rol inicial de una cuenta nueva). La aprueba quien tiene A en usuarios (Responsable General)." },
  reactivar_cuenta: { tipo: "reactivar_cuenta", etiqueta: "Reactivar cuenta", pendiente: "Reactivación solicitada", aprueba: { modulo: "usuarios", accion: "A" }, descripcion: "Reactivar una cuenta dada de baja." },
  ampliar_vigencia: { tipo: "ampliar_vigencia", etiqueta: "Ampliar vigencia", pendiente: "Ampliación de vigencia solicitada", aprueba: { modulo: "usuarios", accion: "A" }, descripcion: "Ampliar la vigencia de una cuenta temporal (o convertirla en permanente)." },
};

export const TIPOS_SOLICITUD = Object.keys(ACCIONES_CRITICAS) as TipoSolicitud[];

/* Modulo del permiso de los registros tecnicos (recepcion = muestras; el resto = ensayos). */
export const MODULO_DE_ENTIDAD: Record<string, Modulo> = {
  muestras_recepcion: "muestras",
  muestras_procesamiento: "ensayos",
  muestras_extraccion: "ensayos",
  muestras_analisis: "ensayos",
  informes: "informes",
  documentos_sgc: "documentos",
  usuarios: "usuarios",
};

/* Permiso que necesita el segundo usuario para aprobar una solicitud concreta. */
export function permisoParaAprobar(tipo: TipoSolicitud, entidad: string): { modulo: Modulo; accion: Accion } {
  const def = ACCIONES_CRITICAS[tipo];
  const modulo = def.aprueba.modulo === "mismo" ? MODULO_DE_ENTIDAD[entidad] || "calidad" : def.aprueba.modulo;
  return { modulo, accion: def.aprueba.accion };
}

/* Estados "borrador/registrado": anular o restaurar desde ahi no requiere segundo usuario. */
export const ESTADOS_BORRADOR = new Set(["registrada", "registrado", "borrador"]);

export const ETIQUETA_ESTADO_SOLICITUD: Record<EstadoSolicitud, string> = {
  pendiente: "Pendiente de autorización",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  cancelada: "Cancelada",
  vencida: "Vencida",
};
