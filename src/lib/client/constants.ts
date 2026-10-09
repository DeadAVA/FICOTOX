
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

/* Nombres cortos para las listas (el nombre completo queda en el tooltip y en la ventana); no cambian los datos guardados. */
export const ANALYSIS_NAME_SHORT: Record<string, string> = {
  acido_domoico: "Ácido domoico (ASP)",
  toxinas_lipofilicas: "Toxinas lipofílicas (DSP)",
  toxinas_paralizantes: "Toxinas paralizantes (PSP)",
};
export const ANALYSIS_METHOD_SHORT: Record<string, string> = {
  hplc_uv_vis: "HPLC-UV",
  hplc_ms_ms: "HPLC-MS/MS",
  hplc_fld: "HPLC-FLD",
  bioensayo_raton: "Bioensayo en ratón",
};
