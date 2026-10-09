/*
 * Módulos que se pueden apagar sin borrar código ni datos. Un módulo apagado
 * desaparece del menú, del Inicio, de la búsqueda y de la edición de roles, y su
 * ruta responde "no existe". Para reactivarlo basta poner `true`.
 */
export const FEATURES = {
  /* Documentos controlados del SGC (Calidad › Documentos). Encendido en la Fase 7 con el flujo de control documental. */
  documentos: true,
} as const;

/* Módulos de permisos que hoy no tienen pantalla: se ocultan de menús y roles. */
export const HIDDEN_MODULES = new Set<string>(FEATURES.documentos ? [] : ["documentos"]);
