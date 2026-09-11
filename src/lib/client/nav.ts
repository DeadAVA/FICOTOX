import { HIDDEN_MODULES } from "../shared/features";
import type { ModuleAction, PermissionsMap } from "./types";

/*
 * Arquitectura de navegacion: una lista corta de destinos de primer nivel;
 * los que agrupan varias pantallas (Muestras, Inventario, Calidad,
 * Administracion) se despliegan en la barra lateral y muestran sus
 * subdestinos. Cada destino declara los modulos RBAC que lo hacen visible.
 */

export type NavIcon = "house" | "testtube" | "report" | "package" | "flask" | "cube" | "wrench" | "arrows" | "filetext" | "clock" | "users" | "shield" | "seal";

export interface NavChild {
  href: string;
  label: string;
  /* Modulo que debe poder leerse; si falta, hereda los del padre. */
  module?: string;
}

export interface NavItem {
  /* Destino del enlace; con hijos, el primero visible sustituye a este valor. */
  href: string;
  label: string;
  modules: string[];
  description: string;
  icon: NavIcon;
  children?: NavChild[];
}

export const INVENTORY_TABS = [
  { href: "/inventario/reactivos", label: "Reactivos", module: "reactivos" },
  { href: "/inventario/consumibles", label: "Consumibles", module: "consumibles" },
  { href: "/inventario/equipos", label: "Equipos", module: "equipos" },
  { href: "/inventario/mantenimiento", label: "Mantenimiento", module: "mantenimiento" },
];

export const SAMPLE_TABS = [
  { href: "/muestras/recepcion", label: "Recepción" },
  { href: "/muestras/procesamiento", label: "Procesamiento" },
  { href: "/muestras/extraccion", label: "Extracción" },
  { href: "/muestras/analisis", label: "Análisis" },
];

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", modules: ["dashboard"], description: "Búsqueda y lo pendiente", icon: "house" },
  { href: "/muestras", label: "Muestras", modules: ["muestras"], description: "Recepción, procesamiento, extracción y análisis", icon: "testtube", children: SAMPLE_TABS },
  { href: "/informes", label: "Informes", modules: ["informes"], description: "Informes de resultados para el cliente", icon: "report" },
  {
    href: "/inventario",
    label: "Inventario",
    modules: ["reactivos", "consumibles", "equipos", "mantenimiento", "movimientos"],
    description: "Reactivos, consumibles, equipos, mantenimiento y movimientos",
    icon: "package",
    children: [...INVENTORY_TABS, { href: "/movimientos", label: "Movimientos", module: "movimientos" }],
  },
  {
    href: "/auditoria",
    label: "Calidad",
    modules: ["documentos", "auditoria"].filter((m) => !HIDDEN_MODULES.has(m)),
    description: HIDDEN_MODULES.has("documentos") ? "Bitácora de auditoría" : "Documentos controlados y bitácora de auditoría",
    icon: "seal",
    children: [
      { href: "/documentos", label: "Documentos", module: "documentos" },
      { href: "/auditoria", label: "Auditoría", module: "auditoria" },
    ].filter((child) => !HIDDEN_MODULES.has(child.module)),
  },
  {
    href: "/administracion/usuarios",
    label: "Administración",
    modules: ["usuarios", "roles"],
    description: "Cuentas de acceso y permisos",
    icon: "users",
    children: [
      { href: "/administracion/usuarios", label: "Usuarios", module: "usuarios" },
      { href: "/administracion/roles", label: "Roles", module: "roles" },
    ],
  },
];

export function canAny(permissions: PermissionsMap, modules: string[], action: ModuleAction = "read"): boolean {
  return modules.some((moduleKey) => !!permissions[moduleKey]?.[action]);
}

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/* Hijos que el rol puede ver; sin `module` heredan los modulos del padre. */
export function visibleChildren(item: NavItem, permissions: PermissionsMap): NavChild[] {
  return (item.children || []).filter((child) => (child.module ? !!permissions[child.module]?.read : canAny(permissions, item.modules)));
}

/* Destinos de primer nivel visibles, con el enlace del padre apuntando a su primer hijo visible. */
export function visibleNav(permissions: PermissionsMap): Array<NavItem & { children: NavChild[] }> {
  return NAV_ITEMS.filter((item) => canAny(permissions, item.modules)).map((item) => {
    const children = visibleChildren(item, permissions);
    return { ...item, href: children[0]?.href || item.href, children };
  });
}

/* Un padre esta activo si la ruta actual cae en el o en cualquiera de sus hijos. */
export function isItemActive(pathname: string, item: NavItem): boolean {
  if (isActivePath(pathname, item.href)) return true;
  return (item.children || []).some((child) => isActivePath(pathname, child.href));
}

/* Primera ruta permitida al entrar. */
export function firstAllowedRoute(permissions: PermissionsMap): string | null {
  return visibleNav(permissions)[0]?.href || null;
}
