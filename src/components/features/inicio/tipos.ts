/*
 * Datos del Inicio (de /inicio/avisos y /inicio/en-curso, de solo lectura y
 * con los permisos y alcances de cada persona).
 */
import type { EtapaFlujo } from "@/lib/client/flujo";

export interface PendienteItem {
  label: string;
  sub: string | null;
  href: string;
  persona_id?: number | null;
  persona?: string | null;
}

export interface Pendiente {
  key: string;
  label: string;
  tone: "danger" | "warning" | "info";
  count: number;
  href: string;
  items: PendienteItem[];
}

export interface PersonaAsignada {
  id: number;
  nombre: string | null;
  email: string | null;
  avatar: string | null;
}

export interface MuestraEnCurso {
  id: number;
  folio: string;
  cliente: string | null;
  muestras: string[];
  etapa_flujo: EtapaFlujo;
  asignados: PersonaAsignada[];
  ultimo_movimiento: string | null;
  fecha_recepcion: string | null;
  siguiente: { label: string; href: string; accion: string };
}
