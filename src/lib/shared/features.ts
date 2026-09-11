/*
 * Módulos que se pueden apagar sin borrar código ni datos. Un módulo apagado
 * desaparece del menú, del Inicio, de la búsqueda y de la edición de roles, y su
 * ruta responde "no existe". Para reactivarlo basta poner `true`.
 */
export const FEATURES = {
  /* Documentos controlados del SGC (Calidad › Documentos). Apagado a petición del laboratorio (2026-09-11) hasta definir su uso. */
  documentos: false,
} as const;

export type FeatureKey = keyof typeof FEATURES;

/*
 * Regla de dos personas (revisar/aprobar/autorizar por alguien distinto).
 * Apagada a petición del laboratorio: basta con tener el permiso de aprobación.
 * Todo sigue quedando en la bitácora con nombre y fecha.
 */
export const TWO_PERSON_RULE = false;

/* Módulos de permisos que hoy no tienen pantalla: se ocultan de menús y roles. */
export const HIDDEN_MODULES = new Set<string>(FEATURES.documentos ? [] : ["documentos"]);
