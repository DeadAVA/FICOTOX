/*
 * Catalogos controlados del SGC compartidos entre servidor y cliente:
 * estados de muestra, decision de aceptacion, disposicion final, analisis,
 * metodos, limites regulatorios, informes y documentos controlados.
 *
 * Fuente: FX-TCF-GMR (recepcion), diagrama "Flujo de trabajo del
 * laboratorio", Manual de Calidad FX-MC-1/1 (7.4, 7.5, 7.8, 8.3) e
 * induccion PVVC 2026-2. Los valores marcados "por confirmar" deben
 * validarse con la Coordinacion de Mejora Continua.
 */

export interface CatalogItem {
  value: string;
  label: string;
  hint?: string;
}

/* ---------- Estados del flujo de muestra ---------- */

export const SAMPLE_STATES: Record<string, { label: string; tone: "neutral" | "brand" | "warning" | "success" | "danger" | "bloom" | "ink" }> = {
  registrada: { label: "Registrada", tone: "brand" },
  aceptada: { label: "Aceptada", tone: "brand" },
  rechazada: { label: "Rechazada", tone: "danger" },
  en_proceso: { label: "En proceso", tone: "warning" },
  completada: { label: "Completada", tone: "success" },
  analizada: { label: "Analizada", tone: "success" },
  informada: { label: "Informada", tone: "success" },
  cerrada: { label: "Cerrada", tone: "ink" },
  anulada: { label: "Anulada", tone: "danger" },
  // Valores historicos de la version anterior.
  procesamiento: { label: "En proceso", tone: "warning" },
  extraccion: { label: "Extracción", tone: "warning" },
  finalizada: { label: "Finalizada", tone: "success" },
  cancelada: { label: "Cancelada", tone: "danger" },
  pendiente: { label: "Pendiente", tone: "neutral" },
};

/* Estados en los que un registro ya no se edita ni se usa como origen de otra etapa. */
export const SAMPLE_TERMINAL_STATES = new Set(["anulada", "rechazada", "cerrada"]);

/* ---------- Recepcion (FX-TCF-GMR) ---------- */

export const RECEPTION_ANALYSIS_TYPES: CatalogItem[] = [
  { value: "acido_domoico", label: "Ácido domoico (ASP)" },
  { value: "toxinas_lipofilicas", label: "Toxinas lipofílicas (DSP / ácido okadaico)" },
  { value: "toxinas_paralizantes", label: "Toxinas paralizantes (PSP / saxitoxina)" },
  { value: "pigmentos", label: "Pigmentos" },
  { value: "plancton", label: "Plancton" },
  { value: "otro", label: "Otro" },
];

/* Metodos exactamente como los lista el formato de recepcion. */
export const RECEPTION_METHODS: CatalogItem[] = [
  { value: "cromatografia_liquidos", label: "Cromatografía de líquidos" },
  { value: "bioensayo_raton", label: "Bioensayo en ratón" },
  { value: "fluorometria", label: "Fluorometría" },
  { value: "microscopia", label: "Microscopía" },
  { value: "otro", label: "Otro" },
];

/* Etiquetas de valores guardados por la version anterior (ya no se ofrecen, pero se muestran). */
export const LEGACY_RECEPTION_METHODS: Record<string, string> = {
  espectrofotometro: "Espectrofotómetro (catálogo anterior)",
  fluorometro: "Fluorómetro (catálogo anterior)",
  luminometro: "Luminómetro (catálogo anterior)",
};

export const RECEPTION_SAMPLE_TYPES: CatalogItem[] = [
  { value: "organismo_completo", label: "Organismo completo" },
  { value: "organismo_partes", label: "Organismo en partes" },
  { value: "masa_visceral", label: "Masa visceral" },
  { value: "filtros", label: "Filtros" },
  { value: "agua_mar", label: "Agua de mar" },
  { value: "otro", label: "Otro" },
];

export const LEGACY_RECEPTION_SAMPLE_TYPES: Record<string, string> = {
  organismo: "Organismo (catálogo anterior)",
  organismo_plancton: "Organismo plancton (catálogo anterior)",
  fitotox: "Fitotox (catálogo anterior)",
};

/* Requisitos de la inspeccion visual, texto integro del formato FX-TCF-GMR. */
export const RECEPTION_INSPECTION_REQUIREMENTS: string[] = [
  "Se presentan en talla comercial.",
  "Se presentan sin alteraciones (estado de descomposición, valvas abiertas/rotas, cuerpos eviscerados).",
  "En el momento de su presentación no han transcurrido más de 24 horas después de haber sido extraídas.",
  "Se presentan en bolsa o botella de plástico transparente, sin alteraciones, como contenedor primario.",
  "El contenedor primario es transportado en una hielera con blue ice/hielo suficiente para mantener la temperatura entre 4 y 10 °C.",
  "Se presentan en cantidad o volumen suficiente para el(los) análisis solicitados.",
  "Se presenta con algún tipo de fijador (en caso positivo especificar el tipo).",
];

/* Textos de la version anterior (aproximados); se conservan para mostrar registros viejos. */
export const LEGACY_INSPECTION_REQUIREMENTS: string[] = [
  "Se presentan en talla comercial",
  "Sin alteraciones visibles (descomposicion, visceras alteradas, cuerpos discordes)",
  "No han transcurrido mas de 24 horas desde su captura",
  "Muestras transportadas en Styracones como contenedor primario",
  "Contenedor primario transportado en hielera con hielo suficiente",
  "Cantidad y volumen suficientes para analisis",
  "Sin algun tipo de flujo (en caso previo especificar)",
];

/* Decision de aceptacion de la muestra (FX-MC 7.4.3). */
export const ACCEPTANCE_DECISIONS: CatalogItem[] = [
  { value: "aceptada", label: "Aceptada", hint: "Cumple las condiciones del protocolo y del cliente." },
  { value: "aceptada_con_desviacion", label: "Aceptada con desviación", hint: "Se comunicó la desviación al cliente y solicitó continuar; el informe llevará el descargo correspondiente." },
  { value: "rechazada", label: "Rechazada", hint: "No cumple; se registra la no conformidad y se comunica al cliente." },
];

/* Disposicion final de remanentes (diagrama de flujo, FX-MC 7.4.4). */
export const DISPOSAL_TYPES: CatalogItem[] = [
  { value: "rpbi", label: "Residuo peligroso biológico-infeccioso (RPBI)" },
  { value: "residuos_comunes", label: "Residuos comunes" },
  { value: "conservado_investigacion", label: "Conservado para investigación" },
  { value: "devuelto_cliente", label: "Devuelto al cliente" },
  { value: "otro", label: "Otro" },
];

/* ---------- Analisis y resultados ---------- */

export interface AnalysisTypeMeta extends CatalogItem {
  short: string;
  /* Limite regulatorio por confirmar con la coordinacion (NOM-242-SSA1-2009 / PMSMB). */
  limite?: { valor: number; unidad: string; nota: string };
  unidad_default: string;
  requiere_extraccion: boolean;
}

export const ANALYSIS_TYPES: AnalysisTypeMeta[] = [
  { value: "acido_domoico", short: "ASP", label: "Ácido domoico (ASP)", unidad_default: "µg/g", limite: { valor: 20, unidad: "µg/g", nota: "20 mg/kg de ácido domoico (por confirmar)" }, requiere_extraccion: true },
  { value: "toxinas_lipofilicas", short: "DSP", label: "Toxinas lipofílicas (DSP / ácido okadaico)", unidad_default: "µg/kg", limite: { valor: 160, unidad: "µg/kg", nota: "160 µg/kg equivalentes de ácido okadaico (por confirmar)" }, requiere_extraccion: true },
  { value: "toxinas_paralizantes", short: "PSP", label: "Toxinas paralizantes (PSP / saxitoxina)", unidad_default: "µg/100 g", limite: { valor: 80, unidad: "µg/100 g", nota: "80 µg equivalentes de saxitoxina por 100 g (por confirmar)" }, requiere_extraccion: true },
  { value: "pigmentos", short: "PIG", label: "Pigmentos", unidad_default: "µg/L", requiere_extraccion: true },
  { value: "plancton", short: "PLK", label: "Plancton", unidad_default: "cél/L", requiere_extraccion: false },
  { value: "otro", short: "OTR", label: "Otro", unidad_default: "", requiere_extraccion: false },
];

/* Metodos analiticos del diagrama de flujo del laboratorio. */
export const ANALYSIS_METHODS: CatalogItem[] = [
  { value: "hplc_uv_vis", label: "Cromatografía líquida de alto rendimiento — UV-VIS" },
  { value: "hplc_ms_ms", label: "Cromatografía líquida — espectrometría de masas (MS/MS)" },
  { value: "hplc_fld", label: "Cromatografía líquida — fluorescencia (FLD)" },
  { value: "bioensayo_raton", label: "Bioensayo en ratón" },
  { value: "microscopia", label: "Microscopía" },
  { value: "fluorometria", label: "Fluorometría" },
  { value: "espectroscopia", label: "Espectroscopía" },
  { value: "otro", label: "Otro" },
];

export const ANALYSIS_STATES: Record<string, { label: string; tone: "neutral" | "brand" | "warning" | "success" | "danger" }> = {
  registrado: { label: "Registrado", tone: "brand" },
  revisado: { label: "Revisado", tone: "warning" },
  aprobado: { label: "Aprobado", tone: "success" },
  anulado: { label: "Anulado", tone: "danger" },
};

export const CONFORMITY_OPTIONS: CatalogItem[] = [
  { value: "cumple", label: "Cumple" },
  { value: "no_cumple", label: "No cumple" },
  { value: "na", label: "No aplica" },
];

/* Como llego la muestra al laboratorio (FX-TCF-GMR). */
export const RECEPTION_DELIVERY_MEDIA: CatalogItem[] = [
  { value: "directa", label: "Entrega directa" },
  { value: "paqueteria", label: "Paquetería" },
  { value: "recoleccion", label: "Recolección" },
  { value: "otro", label: "Otro" },
];

/* Donde se resguarda la muestra al ingresar (FX-TCF-GMR, custodio). */
export const STORAGE_PLACES: CatalogItem[] = [
  { value: "congelador", label: "Congelador" },
  { value: "refrigerador", label: "Refrigerador" },
  { value: "ingreso_analisis", label: "Inicia ingreso para análisis" },
  { value: "otro", label: "Otro" },
];

/* Medio por el que se comunico al cliente una desviacion o rechazo (7.4.3). */
export const CLIENT_CONTACT_MEDIA: CatalogItem[] = [
  { value: "correo", label: "Correo electrónico" },
  { value: "telefono", label: "Teléfono" },
  { value: "presencial", label: "Presencial" },
  { value: "otro", label: "Otro" },
];

/* ---------- Informe de resultados (ISO/IEC 17025 7.8, FX-TCF-IR) ---------- */

export const REPORT_STATES: Record<string, { label: string; tone: "neutral" | "brand" | "warning" | "success" | "danger" | "ink" }> = {
  borrador: { label: "Borrador", tone: "neutral" },
  en_revision: { label: "En revisión", tone: "warning" },
  autorizado: { label: "Autorizado", tone: "success" },
  entregado: { label: "Entregado", tone: "ink" },
  sustituido: { label: "Sustituido por enmienda", tone: "neutral" },
  anulado: { label: "Anulado", tone: "danger" },
};

export const REPORT_DELIVERY_MEDIA: CatalogItem[] = [
  { value: "correo", label: "Correo electrónico" },
  { value: "impreso", label: "Impreso, entrega en mano" },
  { value: "portal", label: "Portal / carpeta compartida" },
  { value: "otro", label: "Otro" },
];

export const REPORT_DEFAULT_STATEMENTS = {
  alcance: "Los resultados se refieren únicamente a los ítems ensayados, en las condiciones en que fueron recibidos por el laboratorio.",
  regla_decision: "La declaración de conformidad se emite comparando el resultado directamente con el límite regulatorio aplicable, sin considerar la incertidumbre de medición (regla de decisión acordada con el cliente en la solicitud de servicio).",
  reproduccion: "Este informe no debe reproducirse, excepto en su totalidad, sin la aprobación escrita del laboratorio.",
};

/* Datos del laboratorio que encabezan el informe (7.8.2.1 b y c). */
export const LAB_IDENTITY = {
  nombre: "Laboratorio Nacional de Análisis, Monitoreo e Investigación sobre Ficotoxinas asociadas a Florecimientos Algales Nocivos (LN-FICOTOX)",
  institucion: "Centro de Investigación Científica y de Educación Superior de Ensenada, Baja California (CICESE)",
  direccion: "Carretera Ensenada-Tijuana No. 3918, Zona Playitas, C.P. 22860, Ensenada, Baja California, México",
  clave_formato: "FX-TCF-IR",
};

/* ---------- Documentos controlados (FX-MC 8.3, FX-GCP-CD) ---------- */

export const DOCUMENT_TYPES: CatalogItem[] = [
  { value: "M", label: "Manual" },
  { value: "P", label: "Procedimiento" },
  { value: "I", label: "Instructivo de trabajo" },
  { value: "F", label: "Formato" },
  { value: "R", label: "Registro" },
  { value: "L", label: "Lista maestra / plan" },
  { value: "B", label: "Bitácora" },
  { value: "E", label: "Documento externo (norma, manual de fabricante)" },
];

/* Area segun el segundo bloque de la clave: FX-GCP-CD -> GC. */
export const DOCUMENT_AREAS: CatalogItem[] = [
  { value: "MC", label: "Manual de calidad" },
  { value: "GC", label: "Gestión de calidad" },
  { value: "TC", label: "Técnica" },
  { value: "AD", label: "Administración" },
  { value: "CO", label: "Comercial / clientes" },
  { value: "TH", label: "Talento humano" },
  { value: "DI", label: "Dirección" },
  { value: "EX", label: "Externo" },
];

export const DOCUMENT_STATES: Record<string, { label: string; tone: "neutral" | "brand" | "warning" | "success" | "danger" | "ink" }> = {
  borrador: { label: "Borrador", tone: "neutral" },
  en_revision: { label: "En revisión", tone: "warning" },
  vigente: { label: "Vigente", tone: "success" },
  obsoleto: { label: "Obsoleto", tone: "ink" },
  cancelado: { label: "Cancelado", tone: "danger" },
};

/* Clave FX-<area><tipo>-<siglas>: FX-GCP-CD, FX-TCF-GMR, FX-ADF-IEQ... */
export const DOCUMENT_KEY_RE = /^FX-[A-Z]{2}[A-Z]-[A-Z0-9]{1,8}(?:-[A-Z0-9]{1,8})?$/;

export function parseDocumentKey(clave: string): { area: string; tipo: string } | null {
  const text = String(clave || "").trim().toUpperCase();
  if (text === "FX-MC") return { area: "MC", tipo: "M" };
  const match = text.match(/^FX-([A-Z]{2})([A-Z])-/);
  if (!match) return null;
  return { area: match[1], tipo: match[2] };
}

/* Revision periodica al menos cada tres anos (FX-MC 7.2.1.2). */
export const DOCUMENT_REVIEW_YEARS = 3;

/* ---------- Auditoria ---------- */

export const AUDIT_ACTIONS: Record<string, string> = {
  crear: "Creó",
  editar: "Editó",
  anular: "Anuló",
  restaurar: "Restauró",
  baja: "Dio de baja",
  reactivar: "Reactivó",
  revisar: "Marcó revisado",
  aprobar: "Aprobó",
  autorizar: "Autorizó",
  entregar: "Entregó",
  rechazar: "Rechazó",
  aceptar: "Aceptó",
  cerrar: "Cerró",
  importar: "Importó",
  eliminar: "Eliminó",
  reponer: "Repuso stock",
  login: "Inició sesión",
  login_fallido: "Intento de acceso fallido",
  descargar: "Descargó",
};

export const AUDIT_ENTITIES: Record<string, string> = {
  muestras_recepcion: "Recepción",
  muestras_procesamiento: "Procesamiento",
  muestras_extraccion: "Extracción",
  muestras_analisis: "Análisis",
  informes: "Informe de resultados",
  documentos_sgc: "Documento SGC",
  reactivos: "Reactivo",
  consumibles: "Consumible",
  equipos: "Equipo",
  mantenimientos: "Mantenimiento",
  usuarios: "Usuario",
  roles: "Rol",
  sesion: "Sesión",
  reportes_mantenimiento: "Reporte de mantenimiento",
};
