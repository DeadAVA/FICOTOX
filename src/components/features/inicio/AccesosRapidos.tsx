"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ChartLine, FileArrowUp, PaperPlaneTilt, Printer, Stamp, TestTube, UserPlus, Users, UsersThree, WarningDiamond, Flask, HandArrowDown, ClipboardText } from "@phosphor-icons/react";
import { cn } from "@/components/ui/cn";
import type { useSession } from "@/components/session/SessionProvider";
import type { MuestraEnCurso, Pendiente } from "./tipos";

/*
 * Accesos rapidos: de 2 a 4 tarjetas pequeñas de accion elegidas por los
 * permisos de la persona (lo que mas hace su rol). Cada una lleva a su
 * pantalla o abre su formulario; si tiene pendientes, un numero pequeño en la
 * esquina.
 */

interface Acceso {
  clave: string;
  label: string;
  href: string;
  icono: ReactNode;
  tono: string;
  pendientes?: number;
}

type Sesion = Pick<ReturnType<typeof useSession>, "can" | "alcance">;

/* En orden de prioridad: se toman las primeras 4 que la persona puede usar. */
export function accesosPara({ can, alcance }: Sesion, pendientes: Pendiente[] | null, muestras: MuestraEnCurso[] | null): Acceso[] {
  const cuenta = (clave: string) => pendientes?.find((p) => p.key === clave)?.count || 0;
  const sinAsignar = (muestras || []).filter((m) => !m.asignados.length && m.etapa_flujo !== "cierre").length;
  const candidatos: Array<Acceso & { puede: boolean }> = [
    { clave: "autorizar", label: "Por autorizar", href: "/solicitudes", icono: <Stamp weight="duotone" />, tono: "bg-warning-soft text-warning-text", pendientes: cuenta("por_autorizar"), puede: can("usuarios", "A") || cuenta("por_autorizar") > 0 },
    { clave: "asignar", label: "Asignar muestras", href: "/muestras/recepcion", icono: <UsersThree weight="duotone" />, tono: "bg-brand-soft text-brand-strong", pendientes: sinAsignar, puede: can("muestras", "A") },
    { clave: "revisar", label: "Por revisar", href: "/muestras/analisis?filtro=pendiente", icono: <ChartLine weight="duotone" />, tono: "bg-deep-2/10 text-deep-2", pendientes: cuenta("analisis_pendientes"), puede: can("ensayos", "R") },
    { clave: "reactivo", label: "Nuevo reactivo", href: "/inventario/reactivos?nuevo=1", icono: <Flask weight="duotone" />, tono: "bg-success-soft text-success-text", puede: can("inventario", "C", { objeto: "catalogo_inventario" }) },
    { clave: "liberar", label: "Informes por liberar", href: "/informes?filtro=autorizado", icono: <PaperPlaneTilt weight="duotone" />, tono: "bg-success-soft text-success-text", pendientes: cuenta("informes_entrega"), puede: can("informes", "A") },
    { clave: "mias", label: "Mis muestras", href: "/muestras/recepcion?mias=1", icono: <TestTube weight="duotone" />, tono: "bg-brand-soft text-brand-strong", pendientes: cuenta("muestras_asignadas"), puede: alcance("muestras", "V") === "asignado" },
    { clave: "analisis", label: "Nuevo análisis", href: "/muestras/analisis/nuevo", icono: <ClipboardText weight="duotone" />, tono: "bg-deep-2/10 text-deep-2", puede: can("ensayos", "C", { objeto: "analisis", borrador: true }) },
    { clave: "recepcion", label: "Nueva recepción", href: "/muestras/recepcion/nueva", icono: <HandArrowDown weight="duotone" />, tono: "bg-brand-soft text-brand-strong", puede: can("muestras", "C", { objeto: "recepcion", borrador: true }) },
    { clave: "etiquetas", label: "Imprimir etiquetas", href: "/muestras/recepcion", icono: <Printer weight="duotone" />, tono: "bg-surface-3 text-ink-2", puede: can("muestras", "C", { objeto: "recepcion", borrador: true }) },
    { clave: "incidencias", label: "Incidencias", href: "/calidad/incidencias", icono: <WarningDiamond weight="duotone" />, tono: "bg-warning-soft text-warning-text", pendientes: cuenta("calidad_incidencias"), puede: can("calidad", "A") },
    { clave: "documento", label: "Subir documento", href: "/calidad/biblioteca?subir=1", icono: <FileArrowUp weight="duotone" />, tono: "bg-brand-soft text-brand-strong", puede: can("documentos", "G") },
    { clave: "nuevo_usuario", label: "Nuevo usuario", href: "/administracion/usuarios?nuevo=1", icono: <UserPlus weight="duotone" />, tono: "bg-brand-soft text-brand-strong", puede: can("usuarios", "G") },
    { clave: "usuarios", label: "Usuarios", href: "/administracion/usuarios", icono: <Users weight="duotone" />, tono: "bg-surface-3 text-ink-2", pendientes: cuenta("accesos_vencen"), puede: can("usuarios", "G") },
  ];
  return candidatos.filter((c) => c.puede).slice(0, 4);
}

export function AccesosRapidos({ accesos, className }: { accesos: Acceso[]; className?: string }) {
  if (!accesos.length) return null;
  return (
    <nav aria-label="Accesos rápidos" className={cn("w-full", className)}>
      {/* Ocupan exactamente el ancho del contenedor, en partes iguales y con la misma altura. */}
      <ul className={cn("grid auto-rows-fr gap-3 sm:gap-4", accesos.length >= 4 ? "grid-cols-2 md:grid-cols-4" : accesos.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {accesos.map((a, i) => (
          <li key={a.clave} className="entrada-escalonada min-w-0" style={{ ["--i" as string]: i }}>
            <Link
              href={a.href}
              aria-label={a.pendientes ? `${a.label}: ${a.pendientes} pendientes` : a.label}
              className="press group relative flex h-full flex-col items-start gap-2 rounded-card bg-surface px-4 py-3.5 shadow-card ring-1 ring-line transition-[box-shadow,transform] duration-200 ease-[var(--ease-spring)] hover:-translate-y-0.5 hover:shadow-raised focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none motion-reduce:hover:translate-y-0 min-[520px]:flex-row min-[520px]:items-center min-[520px]:gap-3"
            >
              <span aria-hidden="true" className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[18px] [&>svg]:h-[1em] [&>svg]:w-[1em]", a.tono)}>
                {a.icono}
              </span>
              <span className="text-[13.5px] leading-tight font-medium text-ink">{a.label}</span>
              {a.pendientes ? (
                <span aria-hidden="true" className="tnum absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-semibold text-on-accent ring-2 ring-canvas animate-pop-in motion-reduce:animate-none">
                  {a.pendientes > 99 ? "99+" : a.pendientes}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
