"use client";

import type { ReactNode } from "react";
import { ArrowClockwise, ArrowCounterClockwise, Archive, Paperclip, Database, CheckCircle, DownloadSimple, Eye, Gear, LockKey, Package, PaperPlaneTilt, PencilSimple, Plus, Prohibit, SealCheck, ShieldCheck, SignIn, Trash, UploadSimple, UserSwitch, Warning, XCircle } from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";
import type { HumanEntry } from "@/lib/client/audit-humanize";

/*
 * Categorias de la bitacora para la vista de Auditoria: agrupan las acciones
 * en siete familias con icono y color suave (crear, editar, firmar/aprobar,
 * anular/rechazar, accesos, exportar, sistema). Solo interfaz: el filtro por
 * categoria envia la lista de acciones al servidor (`acciones=`).
 */

export type Categoria = "crear" | "editar" | "firmar" | "anular" | "accesos" | "exportar" | "sistema";

export const CATEGORIAS: Array<{ value: Categoria; label: string; acciones: string[] }> = [
  { value: "crear", label: "Crear", acciones: ["crear", "importar", "proponer", "enmendar", "reponer", "adjuntar"] },
  { value: "editar", label: "Editar", acciones: ["editar", "restaurar", "reactivar", "cambiar_folio", "reabrir", "cambiar_vigencia", "cambiar_cargo", "asignar_muestra", "revocar_asignacion", "cerrar"] },
  { value: "firmar", label: "Firmar / aprobar", acciones: ["revisar", "aprobar", "autorizar", "liberar", "visto_bueno", "aceptar", "enviar_revision", "publicar", "confirmar_firma", "confirmar_lectura", "confirmar_envio", "aprobar_solicitud", "solicitar", "otorgar_autorizacion", "enviar", "entregar"] },
  { value: "anular", label: "Anular / rechazar", acciones: ["anular", "rechazar", "baja", "eliminar", "devolver", "sustituir", "rechazar_solicitud", "cancelar_solicitud", "regresar_supervision", "revocar_autorizacion", "revocar_rol", "acotar_rol", "anular_adjunto"] },
  { value: "accesos", label: "Accesos", acciones: ["login", "login_fallido", "reauth_fallida", "bloquear", "desbloquear", "cerrar_sesiones", "cambiar_password", "restablecer_password", "asignar_rol"] },
  { value: "exportar", label: "Exportar y descargas", acciones: ["exportar", "descargar", "imprimir_etiquetas"] },
  { value: "sistema", label: "Sistema", acciones: ["vencer_rol", "vencer_solicitud", "vencer_autorizacion", "requiere_enmienda", "alerta_integridad", "respaldar", "restaurar_respaldo"] },
];

/* Inicios de sesion y reautenticaciones: ocultos por omision en la lista (siguen en la bitacora y el CSV). */
export const ACCIONES_DE_SESION = new Set(["login", "login_fallido", "reauth_fallida", "cerrar_sesiones"]);

const POR_ACCION = new Map<string, Categoria>(CATEGORIAS.flatMap((c) => c.acciones.map((a) => [a, c.value] as [string, Categoria])));

export function categoriaDe(entry: Pick<HumanEntry, "verb" | "isSystem">): Categoria {
  const categoria = POR_ACCION.get(entry.verb) || "editar";
  // Lo que hace el sistema por su cuenta (vencimientos, marcas) se pinta como sistema, salvo accesos.
  return entry.isSystem && categoria !== "accesos" ? "sistema" : categoria;
}

export const CATEGORIA_TONO: Record<Categoria, string> = {
  crear: "bg-brand-soft text-brand-strong",
  editar: "bg-surface-3 text-ink-2",
  firmar: "bg-success-soft text-success-text",
  anular: "bg-danger-soft text-danger",
  accesos: "bg-warning-soft text-warning-text",
  exportar: "bg-deep-2/10 text-deep-2",
  sistema: "bg-surface-3 text-ink-3",
};

const ICONO_ACCION: Record<string, ReactNode> = {
  crear: <Plus weight="bold" />,
  importar: <UploadSimple weight="bold" />,
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
  eliminar: <Trash weight="bold" />,
  cerrar: <LockKey weight="bold" />,
  login: <SignIn weight="bold" />,
  login_fallido: <Warning weight="bold" />,
  reauth_fallida: <Warning weight="bold" />,
  bloquear: <LockKey weight="bold" />,
  asignar_rol: <UserSwitch weight="bold" />,
  exportar: <DownloadSimple weight="bold" />,
  descargar: <DownloadSimple weight="bold" />,
  alerta_integridad: <Warning weight="bold" />,
  adjuntar: <Paperclip weight="bold" />,
  anular_adjunto: <Paperclip weight="bold" />,
  respaldar: <Database weight="bold" />,
  restaurar_respaldo: <Database weight="bold" />,
};

const ICONO_CATEGORIA: Record<Categoria, ReactNode> = {
  crear: <Plus weight="bold" />,
  editar: <PencilSimple weight="bold" />,
  firmar: <SealCheck weight="bold" />,
  anular: <Prohibit weight="bold" />,
  accesos: <SignIn weight="bold" />,
  exportar: <DownloadSimple weight="bold" />,
  sistema: <Gear weight="bold" />,
};

/* Icono redondo de la entrada, con el color suave de su categoria. */
export function EntryIcon({ entry, size = "md" }: { entry: HumanEntry; size?: "sm" | "md" | "lg" }) {
  const categoria = categoriaDe(entry);
  const dim = { sm: "h-7 w-7 text-[13px]", md: "h-8 w-8 text-[14px]", lg: "h-11 w-11 text-[19px]" }[size];
  return (
    <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center rounded-full [&>svg]:h-[1em] [&>svg]:w-[1em]", dim, CATEGORIA_TONO[categoria])}>
      {ICONO_ACCION[entry.verb] || ICONO_CATEGORIA[categoria]}
    </span>
  );
}
