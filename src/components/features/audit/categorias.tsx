"use client";

import type { ReactNode } from "react";
import { ArrowClockwise, ArrowCounterClockwise, Archive, ChatCircleDots, CheckCircle, Database, DownloadSimple, Eye, Gear, LockKey, Package, PaperPlaneTilt, Paperclip, PencilSimple, Plus, Printer, Prohibit, SealCheck, ShieldCheck, ShieldWarning, SignIn, UploadSimple, UserSwitch, Warning, XCircle } from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";
import type { HumanEntry } from "@/lib/client/audit-humanize";

/*
 * Tipos de actividad de la bitacora (filtro "Tipo de actividad" y color del
 * icono de cada renglon). El filtro manda al servidor la lista de acciones
 * de cada tipo (`acciones=`). Los inicios de sesion no son un tipo: se
 * muestran con "Vista › Mostrar inicios de sesión".
 */

export type Categoria = "crear" | "cambiar" | "firmar" | "anular" | "solicitudes" | "imprimir" | "sistema";

export const CATEGORIAS: Array<{ value: Categoria; label: string; acciones: string[] }> = [
  { value: "crear", label: "Creaciones", acciones: ["crear", "importar", "proponer", "enmendar", "reponer", "adjuntar", "reportar", "comunicar", "afectar", "subir", "subir_version"] },
  { value: "cambiar", label: "Cambios", acciones: ["editar", "restaurar", "reactivar", "cambiar_folio", "reabrir", "cambiar_vigencia", "cambiar_cargo", "asignar_muestra", "revocar_asignacion", "cerrar", "evaluar", "avanzar", "iniciar_accion", "reasignar", "asignar_rol", "acotar_rol", "otorgar_autorizacion", "bloquear", "desbloquear", "cambiar_password", "restablecer_password", "categoria", "archivar"] },
  { value: "firmar", label: "Firmas y aprobaciones", acciones: ["revisar", "aprobar", "autorizar", "liberar", "visto_bueno", "aceptar", "enviar_revision", "publicar", "confirmar_firma", "confirmar_lectura", "confirmar_envio", "enviar", "entregar", "cerrar_sin_nc", "implementar", "verificar", "reanudar", "liberar_retencion"] },
  { value: "anular", label: "Anulaciones y rechazos", acciones: ["anular", "rechazar", "baja", "eliminar", "devolver", "sustituir", "regresar_supervision", "revocar_autorizacion", "revocar_rol", "anular_adjunto", "escalar", "cancelar", "suspender", "retener"] },
  { value: "solicitudes", label: "Solicitudes", acciones: ["solicitar", "aprobar_solicitud", "rechazar_solicitud", "cancelar_solicitud", "vencer_solicitud"] },
  { value: "imprimir", label: "Impresiones y descargas", acciones: ["imprimir_etiquetas", "descargar", "exportar"] },
  { value: "sistema", label: "Sistema", acciones: ["migrar", "respaldar", "restaurar_respaldo", "alerta_integridad", "vencer_rol", "vencer_autorizacion", "requiere_enmienda"] },
];

const POR_ACCION = new Map<string, Categoria>(CATEGORIAS.flatMap((c) => c.acciones.map((a) => [a, c.value] as [string, Categoria])));

export function categoriaDe(entry: Pick<HumanEntry, "verb" | "isSystem">): Categoria {
  if (["login", "login_fallido", "reauth_fallida", "cerrar_sesiones"].includes(entry.verb)) return "cambiar";
  const categoria = POR_ACCION.get(entry.verb) || "cambiar";
  // Lo que hace la plataforma por su cuenta (vencimientos, avisos) se pinta como sistema.
  return entry.isSystem ? "sistema" : categoria;
}

const TONO: Record<Categoria, string> = {
  crear: "bg-brand-soft text-brand-strong",
  cambiar: "bg-surface-3 text-ink-2",
  firmar: "bg-success-soft text-success-text",
  anular: "bg-danger-soft text-danger",
  solicitudes: "bg-warning-soft text-warning-text",
  imprimir: "bg-deep-2/10 text-deep-2",
  sistema: "bg-surface-3 text-ink-3",
};

const ICONO_ACCION: Record<string, ReactNode> = {
  crear: <Plus weight="bold" />,
  importar: <UploadSimple weight="bold" />,
  subir: <UploadSimple weight="bold" />,
  subir_version: <UploadSimple weight="bold" />,
  reponer: <Package weight="bold" />,
  editar: <PencilSimple weight="bold" />,
  restaurar: <ArrowCounterClockwise weight="bold" />,
  reactivar: <ArrowClockwise weight="bold" />,
  revisar: <Eye weight="bold" />,
  aprobar: <SealCheck weight="bold" />,
  autorizar: <ShieldCheck weight="bold" />,
  liberar: <ShieldCheck weight="bold" />,
  aceptar: <CheckCircle weight="bold" />,
  enviar: <PaperPlaneTilt weight="bold" />,
  enviar_revision: <PaperPlaneTilt weight="bold" />,
  anular: <Prohibit weight="bold" />,
  rechazar: <XCircle weight="bold" />,
  baja: <Archive weight="bold" />,
  archivar: <Archive weight="bold" />,
  cerrar: <LockKey weight="bold" />,
  login: <SignIn weight="bold" />,
  login_fallido: <Warning weight="bold" />,
  reauth_fallida: <Warning weight="bold" />,
  bloquear: <LockKey weight="bold" />,
  asignar_rol: <UserSwitch weight="bold" />,
  imprimir_etiquetas: <Printer weight="bold" />,
  descargar: <DownloadSimple weight="bold" />,
  exportar: <DownloadSimple weight="bold" />,
  alerta_integridad: <ShieldWarning weight="bold" />,
  adjuntar: <Paperclip weight="bold" />,
  anular_adjunto: <Paperclip weight="bold" />,
  respaldar: <Database weight="bold" />,
  restaurar_respaldo: <Database weight="bold" />,
  migrar: <Gear weight="bold" />,
  solicitar: <ChatCircleDots weight="bold" />,
};

const ICONO_CATEGORIA: Record<Categoria, ReactNode> = {
  crear: <Plus weight="bold" />,
  cambiar: <PencilSimple weight="bold" />,
  firmar: <SealCheck weight="bold" />,
  anular: <Prohibit weight="bold" />,
  solicitudes: <ChatCircleDots weight="bold" />,
  imprimir: <Printer weight="bold" />,
  sistema: <Gear weight="bold" />,
};

/* Icono redondo y suave de la actividad, con el color de su tipo. */
export function EntryIcon({ entry, size = "md" }: { entry: HumanEntry; size?: "sm" | "md" | "lg" }) {
  const categoria = categoriaDe(entry);
  const dim = { sm: "h-8 w-8 text-[14px]", md: "h-9 w-9 text-[15px]", lg: "h-12 w-12 text-[20px]" }[size];
  const alerta = entry.verb === "alerta_integridad" || entry.verb === "login_fallido";
  return (
    <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center rounded-full [&>svg]:h-[1em] [&>svg]:w-[1em]", dim, alerta ? "bg-danger-soft text-danger" : TONO[categoria])}>
      {ICONO_ACCION[entry.verb] || ICONO_CATEGORIA[categoria]}
    </span>
  );
}
