import type { ModuleAction, PermissionsMap } from "./types";

/*
 * Arquitectura de navegacion: cinco destinos principales mas administracion.
 * Cada destino declara los modulos RBAC que lo hacen visible.
 */

export interface NavItem {
  href: string;
  label: string;
  modules: string[];
  description: string;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Inicio", modules: ["dashboard"], description: "Estado general del laboratorio" },
  { href: "/muestras", label: "Muestras", modules: ["muestras"], description: "Recepción, procesamiento y extracción" },
  { href: "/inventario", label: "Inventario", modules: ["reactivos", "consumibles", "equipos", "mantenimiento"], description: "Reactivos, consumibles, equipos y mantenimiento" },
  { href: "/movimientos", label: "Movimientos", modules: ["movimientos"], description: "Entradas y salidas de inventario" },
  { href: "/documentos", label: "Documentos", modules: ["documentos"], description: "Documentos SGC y reportes" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/administracion/usuarios", label: "Usuarios", modules: ["usuarios"], description: "Cuentas de acceso" },
  { href: "/administracion/roles", label: "Roles", modules: ["roles"], description: "Permisos por módulo" },
];

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
];

export function canAny(permissions: PermissionsMap, modules: string[], action: ModuleAction = "read"): boolean {
  return modules.some((moduleKey) => !!permissions[moduleKey]?.[action]);
}

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/* Primera ruta permitida al entrar. */
export function firstAllowedRoute(permissions: PermissionsMap): string | null {
  for (const item of [...PRIMARY_NAV, ...ADMIN_NAV]) {
    if (canAny(permissions, item.modules)) {
      if (item.href === "/inventario") {
        const tab = INVENTORY_TABS.find((t) => permissions[t.module]?.read);
        return tab ? tab.href : item.href;
      }
      return item.href;
    }
  }
  return null;
}
