import type { PageKey } from "./types";
import { LEGACY_RECEPTION_METHODS, LEGACY_RECEPTION_SAMPLE_TYPES, RECEPTION_ANALYSIS_TYPES, RECEPTION_INSPECTION_REQUIREMENTS, RECEPTION_METHODS, RECEPTION_SAMPLE_TYPES } from "../shared/sgc";

/* Catalogos y metadatos de la interfaz; los de recepcion salen del formato oficial (src/lib/shared/sgc.ts). */

export const IMPORT_COLUMNS = [
  "producto",
  "marca",
  "proveedor",
  "catalogo_parte_cas",
  "fecha_ingreso",
  "tamano_capacidad",
  "contenedor",
  "piezas",
  "cantidad_por_pieza",
] as const;

/* Texto integro del formato FX-TCF-GMR (los registros viejos con el texto anterior se muestran tal cual). */
export const INSPECCION_REQUIREMENTS = RECEPTION_INSPECTION_REQUIREMENTS;

export interface ReactivoTypeConfig {
  value: string;
  label: string;
  hint: string;
  fields: string[];
}

export const REACTIVO_TYPES: ReactivoTypeConfig[] = [
  {
    value: "acidos",
    label: "Ácidos",
    hint: "Registro principal de ácidos: identificación, proveedor, caducidad, contenedor y existencia en litros.",
    fields: ["id_interno", "producto", "marca", "proveedor", "catalogo_parte_cas_lote", "caducidad", "fecha_apertura", "fecha_ingreso", "contenedor", "capacidad_litros", "piezas", "total_litros_2025"],
  },
  {
    value: "alcoholes_solventes",
    label: "Alcoholes y solventes orgánicos",
    hint: "Incluye localización física, caducidad y remanente para solventes de uso frecuente.",
    fields: ["id_interno", "producto", "marca", "proveedor", "catalogo_parte_cas_lote", "localizacion", "caducidad", "fecha_apertura", "fecha_ingreso", "contenedor", "capacidad_litros", "piezas", "total_litros_2025", "restante_190126"],
  },
  {
    value: "compuestos_amonio",
    label: "Compuestos de Amonio",
    hint: "Control de sales y compuestos de amonio con contenedor, piezas y capacidad.",
    fields: ["id_interno", "producto", "marca", "proveedor", "catalogo_parte_cas_lote", "caducidad", "fecha_apertura", "fecha_ingreso", "contenedor", "capacidad_litros", "piezas", "total_litros_2025"],
  },
  {
    value: "compuestos_sodio",
    label: "Compuestos de Sodio",
    hint: "Registro de compuestos sólidos con capacidad en kilos.",
    fields: ["id_interno", "producto", "marca", "proveedor", "catalogo_parte_cas_lote", "caducidad", "fecha_apertura", "fecha_ingreso", "contenedor", "capacidad_kilos", "piezas", "total_litros_2025"],
  },
  {
    value: "estandares_preparados",
    label: "Estándares preparados",
    hint: "Formato corto para preparaciones internas y notas de preparación.",
    fields: ["item_name", "localizacion", "sub_localizacion", "fecha_preparacion", "informacion_extra"],
  },
  {
    value: "materiales_referencia",
    label: "Materiales de Referencia",
    hint: "Control de CRM por lote, proveedor, método, estado, volumen y URL.",
    fields: ["id_interno", "nombre_crm", "lot_number", "proveedor", "localizacion", "url", "metodo", "caducidad", "fecha_apertura", "estado_reactivo", "volumen"],
  },
  {
    value: "miscelaneos",
    label: "Misceláneos",
    hint: "Registro flexible para sustancias, presentaciones y materiales no clasificados.",
    fields: ["item_name", "vendor", "catalogo", "localizacion", "sub_localizacion", "amount_in_stock", "expiration_date", "lot_number", "cas_number", "bottle_tag_color", "date_opened", "fecha_ingreso", "formula", "id_interno", "physical_state", "presentacion", "tipo_sustancia", "observaciones"],
  },
  {
    value: "columnas_cromatograficas",
    label: "Columnas cromatográficas",
    hint: "Registro técnico de columnas por lote, parte, serie, método y condición de uso.",
    fields: ["id_interno", "producto", "marca", "proveedor", "localizacion", "lote", "parte", "serie", "descripcion", "fecha_ingreso", "fecha_apertura", "nuevo_usado", "metodo", "observaciones"],
  },
];

export interface ReactivoFieldMeta {
  label: string;
  required?: boolean;
  type?: string;
  step?: string;
  min?: string;
  textarea?: boolean;
  wide?: boolean;
  options?: string[];
  target?: string;
}

export const REACTIVO_FIELD_META: Record<string, ReactivoFieldMeta> = {
  producto: { label: "Producto", required: true },
  marca: { label: "Marca" },
  proveedor: { label: "Proveedor" },
  catalogo_parte_cas_lote: { label: "#catálogo / #parte / CAS / lote" },
  localizacion: { label: "Localización" },
  sub_localizacion: { label: "Sub-location" },
  caducidad: { label: "Caducidad", type: "date" },
  fecha_apertura: { label: "Fecha de apertura", type: "date" },
  fecha_ingreso: { label: "Fecha de ingreso", type: "date" },
  contenedor: { label: "Contenedor" },
  /* Columnas heredadas del Excel: informativas; la existencia real vive en "Existencias". */
  capacidad_litros: { label: "Capacidad del envase (litros)", type: "number", step: "0.0001", min: "0" },
  capacidad_kilos: { label: "Capacidad del envase (kilos)", type: "number", step: "0.0001", min: "0" },
  piezas: { label: "Envases (piezas)", type: "number", step: "1", min: "0" },
  total_litros_2025: { label: "Total en litros 2025", type: "number", step: "0.0001", min: "0" },
  restante_190126: { label: "Restante al 19/01/26", type: "number", step: "0.0001", min: "0" },
  lote: { label: "# Lote" },
  parte: { label: "# Parte" },
  serie: { label: "# Serie" },
  descripcion: { label: "Descripción", textarea: true, wide: true },
  nuevo_usado: { label: "Nuevo o usado", options: ["Nuevo", "Usado"] },
  metodo: { label: "Método" },
  observaciones: { label: "Observaciones", textarea: true, wide: true },
  item_name: { label: "Item Name", required: true },
  fecha_preparacion: { label: "Fecha de preparación", type: "date" },
  informacion_extra: { label: "Información extra", textarea: true, wide: true },
  nombre_crm: { label: "Nombre del CRM", required: true },
  lot_number: { label: "Lot Number" },
  url: { label: "URL", type: "url", wide: true },
  estado_reactivo: { label: "Estado", options: ["Nuevo", "Abierto"] },
  volumen: { label: "Volumen", type: "number", step: "0.0001", min: "0" },
  vendor: { label: "Vendor" },
  catalogo: { label: "Catalog #" },
  amount_in_stock: { label: "Amount in Stock", type: "number", step: "0.0001", min: "0" },
  expiration_date: { label: "Expiration Date", type: "date" },
  cas_number: { label: "CAS Number" },
  bottle_tag_color: { label: "Bottle Tag Color" },
  date_opened: { label: "Date Opened", type: "date" },
  formula: { label: "Formula" },
  id_interno: { label: "ID interno" },
  physical_state: { label: "Physical State", options: ["Sólido", "Líquido", "Gas", "Mixto"] },
  presentacion: { label: "Presentación" },
  tipo_sustancia: { label: "Tipo de sustancia" },
};

export const REACTIVO_SHEET_TYPE_LABELS: Record<string, string> = {
  acidos: "Ácidos",
  alcoholes_solventes: "Alcoholes y solventes orgánicos",
  compuestos_amonio: "Compuestos de Amonio",
  compuestos_sodio: "Compuestos de Sodio",
  estandares_preparados: "Estándares preparados",
  materiales_referencia: "Materiales de Referencia",
  miscelaneos: "Misceláneos",
  columnas_cromatograficas: "Columnas cromatográficas",
};

export const PAGE_MODULE_MAP: Record<PageKey, string> = {
  dashboard: "dashboard",
  reactivos: "reactivos",
  consumibles: "consumibles",
  equipos: "equipos",
  muestras: "muestras",
  movimientos: "movimientos",
  mantenimiento: "mantenimiento",
  documentos: "documentos",
  reportes: "documentos",
  roles: "roles",
  usuarios: "usuarios",
};

export const PAGE_LABELS: Record<PageKey, string> = {
  dashboard: "Dashboard",
  reactivos: "Reactivos",
  consumibles: "Consumibles",
  equipos: "Equipos",
  muestras: "Muestras",
  movimientos: "Movimientos",
  mantenimiento: "Mantenimiento",
  documentos: "Documentos SGC",
  reportes: "Reportes Mantenimiento",
  roles: "Roles",
  usuarios: "Usuarios",
};

export const PREFERRED_PAGE_ORDER: PageKey[] = [
  "dashboard",
  "reactivos",
  "consumibles",
  "equipos",
  "muestras",
  "movimientos",
  "mantenimiento",
  "documentos",
  "roles",
  "usuarios",
];

export interface ModuleCardConfig {
  page: PageKey;
  label: string;
  desc: string;
  icon: string;
  color: string;
}

export const MODULE_CARDS_CONFIG: ModuleCardConfig[] = [
  { page: "reactivos", label: "Reactivos", desc: "Gestiona el catálogo de reactivos del laboratorio", icon: "bi-prescription2", color: "" },
  { page: "consumibles", label: "Consumibles", desc: "Control de materiales consumibles", icon: "bi-box-seam", color: "amber" },
  { page: "equipos", label: "Equipos", desc: "Registro y calibración de equipos", icon: "bi-magic", color: "violet" },
  { page: "muestras", label: "Muestras", desc: "Recepción y seguimiento de muestras", icon: "bi-eyedropper", color: "green" },
  { page: "movimientos", label: "Movimientos", desc: "Historial de entradas y salidas de inventario", icon: "bi-journal-text", color: "sky" },
  { page: "mantenimiento", label: "Mantenimiento", desc: "Programación y registro de mantenimientos", icon: "bi-wrench-adjustable-circle", color: "rose" },
  { page: "documentos", label: "Documentos SGC", desc: "Gestión documental del sistema de calidad", icon: "bi-file-earmark-text", color: "slate" },
];

export const SAMPLE_ANALYSIS_LABELS: Record<string, string> = Object.fromEntries(RECEPTION_ANALYSIS_TYPES.map((item) => [item.value, item.label]));

export const SAMPLE_METHOD_LABELS: Record<string, string> = { ...LEGACY_RECEPTION_METHODS, ...Object.fromEntries(RECEPTION_METHODS.map((item) => [item.value, item.label])) };

export const SAMPLE_MATRIX_LABELS: Record<string, string> = { ...LEGACY_RECEPTION_SAMPLE_TYPES, ...Object.fromEntries(RECEPTION_SAMPLE_TYPES.map((item) => [item.value, item.label])) };

export interface StatusMeta {
  label: string;
  className: string;
  icon: string;
}

export const EQUIPO_STATUS_META: Record<string, StatusMeta> = {
  operativo: { label: "Operativo", className: "active", icon: "bi-check-circle" },
  mantenimiento: { label: "En Mantenimiento", className: "warning", icon: "bi-wrench-adjustable" },
  calibracion_pendiente: { label: "Calibracion Pendiente", className: "info", icon: "bi-clock-history" },
  fuera_servicio: { label: "Fuera de Servicio", className: "danger", icon: "bi-exclamation-triangle" },
};

export const MANTENIMIENTO_STATUS_META: Record<string, StatusMeta> = {
  programado: { label: "Programado", className: "neutral", icon: "bi-calendar-event" },
  en_proceso: { label: "En Proceso", className: "info", icon: "bi-clock-history" },
  completado: { label: "Completado", className: "active", icon: "bi-check-circle" },
  vencido: { label: "Vencido", className: "danger", icon: "bi-exclamation-triangle" },
};

export const MANTENIMIENTO_TYPE_META: Record<string, { label: string; className: string }> = {
  preventivo: { label: "Preventivo", className: "outline" },
  correctivo: { label: "Correctivo", className: "warning" },
  calibracion: { label: "Calibracion", className: "purple" },
};
