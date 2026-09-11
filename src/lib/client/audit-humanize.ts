import type { ApiRecord } from "@/lib/client/types";
import { ACCEPTANCE_DECISIONS, ANALYSIS_STATES, AUDIT_ENTITIES, CLIENT_CONTACT_MEDIA, DISPOSAL_TYPES, DOCUMENT_STATES, RECEPTION_DELIVERY_MEDIA, REPORT_DELIVERY_MEDIA, REPORT_STATES, SAMPLE_STATES, STORAGE_PLACES } from "@/lib/shared/sgc";

/*
 * Traduce una entrada de la bitacora de auditoria a lenguaje llano:
 * "Daniela Cortés marcó revisado el análisis A 0000004" + hechos clave
 * (estado anterior → nuevo, a quién se entregó, qué disposición...) + una
 * lista de cambios con etiquetas en español y valores legibles, sin JSON.
 */

export type AuditTone = "neutral" | "brand" | "success" | "warning" | "danger" | "ink";

export interface HumanChange {
  /* Etiqueta del campo en español. */
  label: string;
  before: string;
  after: string;
  /* Cambio de estado: se muestra como par de etiquetas. */
  isState?: boolean;
  /* Para listas (equipos, documentos): lineas ya redactadas en vez de antes/despues. */
  lines?: string[];
}

export interface HumanEntry {
  id: number;
  when: Date | null;
  actor: string;
  actorEmail: string | null;
  isSystem: boolean;
  /* Frase completa sin el actor: "creó la recepción R 0000011". */
  action: string;
  /* Solo el verbo, para el icono/tono. */
  verb: string;
  tone: AuditTone;
  entityLabel: string;
  reference: string | null;
  /* Hechos cortos para mostrar como chips: "Estado: Registrada → Anulada". */
  facts: string[];
  motivo: string | null;
  changes: HumanChange[];
  href: string | null;
  hash: string | null;
}

type Cambios = Record<string, { antes?: unknown; despues?: unknown } | unknown>;

const ENTITY_NOUN: Record<string, { art: string; noun: string; plural: string }> = {
  muestras_recepcion: { art: "la", noun: "recepción", plural: "recepciones" },
  muestras_procesamiento: { art: "el", noun: "procesamiento", plural: "procesamientos" },
  muestras_extraccion: { art: "la", noun: "extracción", plural: "extracciones" },
  muestras_analisis: { art: "el", noun: "análisis", plural: "análisis" },
  informes: { art: "el", noun: "informe", plural: "informes" },
  documentos_sgc: { art: "el", noun: "documento", plural: "documentos" },
  reactivos: { art: "el", noun: "reactivo", plural: "reactivos" },
  consumibles: { art: "el", noun: "consumible", plural: "consumibles" },
  equipos: { art: "el", noun: "equipo", plural: "equipos" },
  mantenimientos: { art: "el", noun: "mantenimiento", plural: "mantenimientos" },
  reportes_mantenimiento: { art: "el", noun: "reporte de mantenimiento", plural: "reportes de mantenimiento" },
  usuarios: { art: "el", noun: "usuario", plural: "usuarios" },
  roles: { art: "el", noun: "rol", plural: "roles" },
  sesion: { art: "la", noun: "sesión", plural: "sesiones" },
};

export const ACTION_TONE: Record<string, AuditTone> = {
  crear: "brand",
  editar: "neutral",
  anular: "danger",
  restaurar: "warning",
  baja: "danger",
  reactivar: "warning",
  revisar: "warning",
  aprobar: "success",
  autorizar: "success",
  entregar: "ink",
  rechazar: "danger",
  aceptar: "success",
  cerrar: "ink",
  reponer: "brand",
  importar: "brand",
  eliminar: "danger",
  login: "neutral",
  login_fallido: "danger",
  descargar: "neutral",
};

/* Etiquetas de campos. Lo que no esta aqui se muestra con el nombre "humanizado" (guiones bajos → espacios). */
const FIELD_LABELS: Record<string, string> = {
  estado: "Estado",
  estado_previo: "Estado anterior",
  motivo_anulacion: "Motivo de anulación",
  motivo_enmienda: "Motivo de la enmienda",
  anulado_en: "Anulado el",
  restaurado_en: "Restaurado el",
  revisado_en: "Revisado el",
  revisado_nombre: "Revisó",
  revisado_cargo: "Cargo de quien revisó",
  revision_observaciones: "Observaciones de la revisión",
  aprobado_en: "Aprobado el",
  aprobado_nombre: "Aprobó",
  autorizado_en: "Autorizado el",
  autorizado_nombre: "Autorizó",
  autorizado_cargo: "Cargo de quien autorizó",
  fecha_emision: "Fecha de emisión",
  fecha_recepcion: "Fecha de recepción",
  hora_recepcion: "Hora de recepción",
  fecha_procesamiento: "Fecha de procesamiento",
  fecha_extraccion: "Fecha de extracción",
  fecha_analisis: "Fecha de análisis",
  fecha_muestra: "Fecha de la muestra",
  decision_aceptacion: "Decisión de aceptación",
  id_interno: "ID interno",
  solicitante: "Solicitante",
  recibido_por: "Recibido por",
  medio_recepcion: "Medio de recepción",
  tipo_organismo: "Tipo de organismo",
  parte_organismo: "Parte del organismo",
  tipo_molienda: "Tipo de molienda",
  tipo_registro: "Formato",
  tipo_analisis: "Tipo de análisis",
  metodo: "Método",
  metodo_otro: "Otro método",
  metodo_referencia: "Referencia del método",
  observaciones: "Observaciones",
  observaciones_generales: "Observaciones generales",
  cliente_nombre: "Cliente",
  cliente_contacto: "Contacto del cliente",
  cliente_direccion: "Dirección del cliente",
  alcance: "Alcance de los resultados",
  regla_decision: "Regla de decisión",
  desviaciones: "Desviaciones del método",
  descargo: "Descargo",
  opiniones: "Opiniones e interpretaciones",
  elaborado_nombre: "Elaboró",
  elaborado_cargo: "Cargo de quien elaboró",
  analista_nombre: "Analista",
  nombre_quien_proceso: "Quien procesó",
  nombre_quien_superviso: "Quien supervisó",
  equipos_json: "Equipos utilizados",
  disposicion_json: "Disposición final",
  entrega_json: "Entrega al cliente",
  resultados_json: "Resultados",
  uso_inventario_json: "Insumos usados",
  analisis_ids_json: "Análisis incluidos",
  nombre: "Nombre",
  producto: "Producto",
  clave: "Clave",
  clave_documento: "Clave del documento",
  titulo: "Título",
  revision: "Revisión",
  cantidad_actual: "Cantidad actual",
  cantidad_total: "Cantidad total",
  unidad: "Unidad",
  caducidad: "Caducidad",
  lote: "Lote",
  marca: "Marca",
  ubicacion: "Ubicación",
  stock_minimo: "Stock mínimo",
  stock_actual: "Stock actual",
  fecha_programada: "Fecha programada",
  fecha_realizada: "Fecha realizada",
  proxima_calibracion: "Próxima calibración",
  responsable: "Responsable",
  email: "Correo",
  rol: "Rol",
  rol_id: "Rol",
  id_rol: "Rol",
  activo: "Activo",
  avatar: "Avatar",
  version: "Versión",
  archivo_pdf: "Archivo PDF",
  fecha: "Fecha",
  medio: "Medio",
  a_quien: "Entregado a",
  remanentes: "Remanentes",
  tipo: "Tipo",
  tipo_otro: "Otro tipo",
  persona: "Persona contactada",
  respuesta: "Respuesta del cliente",
  decision: "Decisión",
  disposicion: "Disposición",
  excepcion: "Excepción",
  insertados: "Registros insertados",
  actualizados: "Registros actualizados",
  permisos: "Permisos",
  proveedor: "Proveedor de acceso",
  existe_usuario: "Usuario existente",
  nueva_revision_de: "Nueva revisión del documento",
  revisiones_obsoletas: "Revisiones marcadas como obsoletas",
  enmienda_de: "Enmienda del informe",
  sustituye_a: "Sustituye a",
  baja_en: "Dado de baja el",
  baja_motivo: "Motivo de la baja",
  reactivado_en: "Reactivado el",
  motivo_restauracion: "Motivo de la restauración",
  fecha_baja: "Fecha de baja",
  descripcion: "Descripción",
  categoria: "Categoría",
  proveedor_nombre: "Proveedor",
  costo: "Costo",
  presentacion: "Presentación",
  numero_serie: "Número de serie",
  modelo: "Modelo",
  frecuencia: "Frecuencia",
  tipo_mantenimiento: "Tipo de mantenimiento",
  resultado: "Resultado",
  area: "Área",
  tipo_documento: "Tipo de documento",
  fecha_vigencia: "Fecha de vigencia",
  proxima_revision: "Próxima revisión",
  elaboro: "Elaboró",
  reviso: "Revisó",
  aprobo: "Aprobó",
  archivo: "Archivo",
  can_read: "Ver",
  can_create: "Crear",
  can_update: "Editar",
  can_delete: "Anular / dar de baja",
  es_sistemico: "Usuario del sistema",
  auth_provider: "Acceso mediante",
  ultimo_acceso: "Último acceso",
  contrasena: "Contraseña",
  cantidad: "Cantidad",
  movimientos_repuestos: "Movimientos de inventario repuestos",
  ignorados: "Filas ignoradas",
  errores: "Errores",
  bivalvos_steps_json: "Pasos (bivalvos)",
  sardinas_steps_json: "Pasos (sardinas)",
  lote_seleccion_json: "Muestras del lote",
  datos_solicitante_json: "Datos del solicitante",
  datos_custodio_json: "Custodio y resguardo",
  inspeccion_json: "Inspección visual",
  aceptacion_json: "Decisión de aceptación",
  comunicacion_cliente_json: "Comunicación al cliente",
  analisis_json: "Análisis solicitado",
  resguardo_json: "Resguardo",
  cliente_json: "Cliente",
  elaboro_json: "Elaboró",
  pasos_json: "Pasos del protocolo",
  resultados_congelados_json: "Resultados incluidos",
  controles_json: "Controles de calidad",
  condiciones_json: "Condiciones ambientales",
  equipo_json: "Equipo",
  nombre_entrega: "Entregó la muestra",
  nombre_cargo_firma: "Nombre y cargo",
  lugar_resguardo: "Lugar de resguardo",
  lugar_otro: "Detalle del lugar",
  temperatura_llegada: "Temperatura de llegada",
  checklist: "Requisitos",
  requisito: "Requisito",
  observacion: "Observación",
  tipos: "Tipos",
  metodos: "Métodos",
  tipos_muestra: "Tipos de muestra",
  hora: "Hora",
  peso: "Peso",
  equipo: "Equipo",
  uso: "Uso",
  clave_bitacora: "Clave de bitácora",
  folio_bitacora: "Folio de bitácora",
  folio_num: "Folio",
  folio: "Folio",
  cargo: "Cargo",
  id_muestra: "Muestra",
  limite_regulatorio: "Límite aplicable",
  limite_deteccion: "Límite de detección",
  limite_cuantificacion: "Límite de cuantificación",
  incertidumbre: "Incertidumbre",
  cumple: "Conformidad",
  resultado_texto: "Resultado (texto)",
};

/* Campos tecnicos o duplicados que no aportan al usuario. */
const HIDDEN_FIELDS = new Set([
  "id",
  "hash",
  "pdf_sha256",
  "sha256",
  "pdf",
  "revisado_firma",
  "aprobado_firma",
  "autorizado_firma",
  "elaborado_firma",
  "analista_firma",
  "firma",
  "revisado_por",
  "aprobado_por",
  "autorizado_por",
  "anulado_por",
  "restaurado_por",
  "registrado_por",
  "entregado_por",
  "creado_por",
  "actualizado_por",
  "usuario_id",
  "created_at",
  "updated_at",
  "actualizado_en",
  "registrado_en",
  "entregado_en",
  "password_hash",
  "id_mantenimiento",
  // Copia interna del estado para poder restaurar; el cambio de estado ya se muestra.
  "estado_previo",
  // Ids de relaciones y datos internos de la cuenta Microsoft.
  "id_equipo",
  "equipo_id",
  "id_permiso",
  "microsoft_oid",
  "microsoft_tid",
  "microsoft_preferred_username",
  "hojas",
  // Columnas heredadas del sistema anterior que duplican a las actuales.
  "amount_in_stock",
  "item_name",
  "nombre_crm",
  "unidad_total",
  "total_litros_2025",
  "fecha_vencimiento",
]);

/* Campos 0/1 que en realidad son sí/no. */
const BOOLEAN_FIELDS = new Set(["activo", "trabajar", "conformidad", "muestra_unica", "requiere_extraccion", "es_blanco", "vigente", "obsoleto", "existe_usuario", "es_sistemico"]);
const isBooleanField = (key: string) => BOOLEAN_FIELDS.has(key) || key.startsWith("can_");
/* Ademas de la lista, todo campo "*_por" es un id de usuario: no se muestra. */
const isHidden = (key: string) => HIDDEN_FIELDS.has(key) || (key.endsWith("_por") && key !== "recibido_por");

const catalogLabel = (items: { value: string; label: string }[], value: unknown) => items.find((item) => item.value === String(value))?.label;

const STATE_BY_ENTITY: Record<string, Record<string, { label: string }>> = {
  muestras_recepcion: SAMPLE_STATES,
  muestras_procesamiento: SAMPLE_STATES,
  muestras_extraccion: SAMPLE_STATES,
  muestras_analisis: ANALYSIS_STATES,
  informes: REPORT_STATES,
  documentos_sgc: DOCUMENT_STATES,
};
const GENERIC_STATES: Record<string, string> = { pendiente: "Pendiente", vencido: "Vencido", completado: "Completado", programado: "Programado", cancelado: "Cancelado", activo: "Activo", inactivo: "Inactivo", baja: "Dado de baja", vigente: "Vigente", obsoleto: "Obsoleto" };

const CONSUMED_DETAIL = new Set(["enmienda_de", "enmienda", "nueva_revision_de", "avatar", "contrasena", "excepcion", "revisiones_obsoletas", "pdf", "sha256", "a_quien", "medio", "fecha", "decision", "disposicion", "cantidad", "insertados", "actualizados", "ignorados", "errores", "hojas", "movimientos_repuestos", "proveedor", "existe_usuario", "motivo", "permisos"]);
const DELIVERY_PHRASE: Record<string, string> = { correo: "por correo electrónico", impreso: "en mano (impreso)", portal: "por el portal o carpeta compartida", otro: "por otro medio" };
const providerLabel = (value: unknown) => ({ microsoft: "Microsoft", local: "contraseña local" })[String(value)] || String(value);
const exceptionLabel = (value: unknown) => {
  const text = String(value);
  if (/misma persona/.test(text)) return "Excepción: la misma persona hizo dos pasos que normalmente hacen personas distintas";
  return `Excepción: ${text}`;
};

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function fmtWhen(value: unknown): string {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const fmtDateOnly = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });

const humanKey = (key: string) => {
  const clean = key.replace(/_json$/, "").replace(/_/g, " ");
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};

export const fieldLabel = (key: string) => FIELD_LABELS[key] || humanKey(key);

/* Valor legible segun el campo y la entidad. */
export function humanValue(key: string, value: unknown, entidad?: string): string {
  if (value === null || value === undefined || value === "" || value === "-") return "vacío";
  if (value === "[firma]") return "firma registrada";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (isBooleanField(key) && (value === 0 || value === 1 || value === "0" || value === "1")) return String(value) === "1" ? "Sí" : "No";
  if (key === "id_rol" || key === "rol_id") return `rol #${String(value)}`;
  if (typeof value === "number") return value.toLocaleString("es-MX");
  if (typeof value === "string") {
    if (key === "estado" || key === "estado_previo") {
      const table = (entidad && STATE_BY_ENTITY[entidad]) || {};
      return table[value]?.label || GENERIC_STATES[value] || humanKey(value);
    }
    if (key === "decision_aceptacion" || key === "decision") return catalogLabel(ACCEPTANCE_DECISIONS, value) || humanKey(value);
    if (key === "disposicion" || (key === "tipo" && catalogLabel(DISPOSAL_TYPES, value))) return catalogLabel(DISPOSAL_TYPES, value) || humanKey(value);
    if (key === "medio") return catalogLabel(REPORT_DELIVERY_MEDIA, value) || catalogLabel(CLIENT_CONTACT_MEDIA, value) || humanKey(value);
    if (key === "medio_recepcion") return catalogLabel(RECEPTION_DELIVERY_MEDIA, value) || humanKey(value);
    if (key === "lugar_resguardo") return catalogLabel(STORAGE_PLACES, value) || humanKey(value);
    if (ISO_DATETIME.test(value)) return fmtWhen(value);
    if (ISO_DATE.test(value)) return fmtDateOnly(value);
    return value;
  }
  if (Array.isArray(value)) {
    if (!value.length) return "vacío";
    return value.map((item) => (typeof item === "object" && item ? describeObject(item as ApiRecord, entidad) : humanValue(key, item, entidad))).join("; ");
  }
  if (typeof value === "object") return describeObject(value as ApiRecord, entidad);
  return String(value);
}

/* Un objeto (disposicion, entrega, equipo...) como "Etiqueta: valor · Etiqueta: valor". */
function describeObject(obj: ApiRecord, entidad?: string): string {
  if (obj.nombre && (obj.clave_bitacora !== undefined || obj.equipo_id !== undefined)) {
    // Equipo utilizado en un formato.
    const parts = [String(obj.nombre)];
    if (obj.uso) parts.push(String(obj.uso));
    if (obj.clave_bitacora || obj.folio_bitacora) parts.push(`bitácora ${[obj.clave_bitacora, obj.folio_bitacora ? `folio ${obj.folio_bitacora}` : null].filter(Boolean).join(" ")}`);
    return parts.join(" · ");
  }
  const parts: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (isHidden(key) || value === null || value === undefined || value === "") continue;
    parts.push(`${fieldLabel(key)}: ${humanValue(key, value, entidad)}`);
  }
  return parts.join(" · ") || "vacío";
}

const isPair = (value: unknown): value is { antes?: unknown; despues?: unknown } => !!value && typeof value === "object" && !Array.isArray(value) && ("antes" in (value as object) || "despues" in (value as object));

const itemKey = (item: unknown, index: number) => {
  if (item && typeof item === "object") {
    const record = item as ApiRecord;
    const base = record.equipo_id ?? record.id ?? record.ref ?? record.clave ?? record.nombre ?? record.id_muestra ?? record.requisito ?? index;
    return record.tipo && record.ref !== undefined ? `${String(record.tipo)}:${String(base)}` : String(base);
  }
  return String(item);
};

const isPlainObject = (value: unknown): value is ApiRecord => !!value && typeof value === "object" && !Array.isArray(value);

/* Claves que cambiaron entre dos objetos, una linea por clave. */
function diffObjects(before: ApiRecord, after: ApiRecord, entidad?: string): string[] {
  const lines: string[] = [];
  for (const field of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (isHidden(field)) continue;
    const a = before[field];
    const b = after[field];
    if (JSON.stringify(a ?? null) === JSON.stringify(b ?? null)) continue;
    if (Array.isArray(a) && Array.isArray(b)) {
      for (const line of diffLists(a, b, entidad)) lines.push(`${fieldLabel(field)}: ${line}`);
      continue;
    }
    if (isPlainObject(a) && isPlainObject(b)) {
      for (const line of diffObjects(a, b, entidad)) lines.push(`${fieldLabel(field)} · ${line}`);
      continue;
    }
    lines.push(`${fieldLabel(field)}: ${humanValue(field, a, entidad)} → ${humanValue(field, b, entidad)}`);
  }
  return lines;
}

/* Diferencia entre dos listas: agregados, quitados y modificados, en frases. */
function diffLists(before: unknown[], after: unknown[], entidad?: string): string[] {
  const lines: string[] = [];
  const mapBefore = new Map(before.map((item, i) => [itemKey(item, i), item]));
  const mapAfter = new Map(after.map((item, i) => [itemKey(item, i), item]));
  for (const [key, item] of mapAfter) {
    const prev = mapBefore.get(key);
    if (prev === undefined) {
      lines.push(`Se agregó: ${humanValue("", item, entidad)}`);
      continue;
    }
    if (JSON.stringify(prev) === JSON.stringify(item)) continue;
    if (prev && item && typeof prev === "object" && typeof item === "object") {
      const name = (item as ApiRecord).nombre || (item as ApiRecord).id_muestra || (item as ApiRecord).requisito || (item as ApiRecord).clave || key;
      const changed: string[] = [];
      for (const field of new Set([...Object.keys(prev as object), ...Object.keys(item as object)])) {
        if (isHidden(field)) continue;
        const a = (prev as ApiRecord)[field];
        const b = (item as ApiRecord)[field];
        if (JSON.stringify(a) !== JSON.stringify(b)) changed.push(`${fieldLabel(field).toLowerCase()} ${humanValue(field, a, entidad)} → ${humanValue(field, b, entidad)}`);
      }
      lines.push(`${String(name)}: ${changed.join(", ") || "modificado"}`);
    } else {
      lines.push(`${humanValue("", prev, entidad)} → ${humanValue("", item, entidad)}`);
    }
  }
  for (const [key, item] of mapBefore) if (!mapAfter.has(key)) lines.push(`Se quitó: ${humanValue("", item, entidad)}`);
  return lines;
}

function humanChanges(cambios: Cambios, entidad: string): HumanChange[] {
  const out: HumanChange[] = [];
  for (const [key, raw] of Object.entries(cambios || {})) {
    if (key === "_detalle" || isHidden(key)) continue;
    const pair = isPair(raw) ? raw : { antes: undefined, despues: raw };
    const before = pair.antes;
    const after = pair.despues;
    if (JSON.stringify(before ?? null) === JSON.stringify(after ?? null)) continue;
    if (key === "analisis_ids_json" && Array.isArray(before || []) && Array.isArray(after || [])) {
      // Ids internos: solo cuenta cuántos entraron o salieron.
      const b = new Set((before || []) as unknown[]);
      const a = new Set((after || []) as unknown[]);
      const added = [...a].filter((x) => !b.has(x)).length;
      const removed = [...b].filter((x) => !a.has(x)).length;
      const lines = [added ? `Se agregó ${added === 1 ? "1 análisis" : `${added} análisis`}` : null, removed ? `Se quitó ${removed === 1 ? "1 análisis" : `${removed} análisis`}` : null].filter(Boolean) as string[];
      if (lines.length) out.push({ label: fieldLabel(key), before: "", after: "", lines });
      continue;
    }
    if (Array.isArray(before) && Array.isArray(after)) {
      const lines = diffLists(before, after, entidad);
      if (lines.length) out.push({ label: fieldLabel(key), before: "", after: "", lines });
      continue;
    }
    if (isPlainObject(before) && isPlainObject(after)) {
      // Dos objetos: solo las claves que cambiaron, no el objeto entero dos veces.
      const lines = diffObjects(before, after, entidad);
      if (lines.length) out.push({ label: fieldLabel(key), before: "", after: "", lines });
      continue;
    }
    out.push({ label: fieldLabel(key), before: humanValue(key, before, entidad), after: humanValue(key, after, entidad), isState: key === "estado" });
  }
  // El estado primero; el resto en orden alfabetico por etiqueta.
  return out.sort((a, b) => Number(!!b.isState) - Number(!!a.isState) || a.label.localeCompare(b.label, "es"));
}

const ENTITY_ROUTE: Partial<Record<string, (id: string, referencia: string) => string>> = {
  muestras_recepcion: (id) => `/muestras/recepcion/${id}`,
  muestras_procesamiento: (id) => `/muestras/procesamiento/${id}`,
  muestras_extraccion: (id) => `/muestras/extraccion/${id}`,
  muestras_analisis: (id) => `/muestras/analisis/${id}`,
  informes: (id) => `/informes/${id}`,
  documentos_sgc: (_id, ref) => `/documentos?buscar=${encodeURIComponent(ref)}`,
  reactivos: (_id, ref) => `/inventario/reactivos?buscar=${encodeURIComponent(ref)}`,
  consumibles: (_id, ref) => `/inventario/consumibles?buscar=${encodeURIComponent(ref)}`,
  equipos: (_id, ref) => `/inventario/equipos?buscar=${encodeURIComponent(ref)}`,
  mantenimientos: () => `/inventario/mantenimiento`,
  usuarios: () => `/administracion/usuarios`,
  roles: () => `/administracion/roles`,
};

export function humanizeAuditEntry(entry: ApiRecord): HumanEntry {
  const entidad = String(entry.entidad || "");
  const accion = String(entry.accion || "");
  // El servidor guarda "mantenimiento calibracion equipo 12"; aqui basta "calibración · equipo 12".
  const referencia = entry.referencia ? String(entry.referencia).replace(/^mantenimiento\s+(\w+)\s+equipo\s+(\d+)$/i, (_m, tipo: string, id: string) => `de ${tipo.replace("calibracion", "calibración").replace("verificacion", "verificación")} del equipo #${id}`) : null;
  const cambios = (entry.cambios || {}) as Cambios;
  const detalle = ((cambios._detalle as ApiRecord | undefined) || {}) as ApiRecord;
  const noun = ENTITY_NOUN[entidad] || { art: "el", noun: (AUDIT_ENTITIES[entidad] || entidad || "registro").toLowerCase(), plural: "registros" };
  const obj = referencia ? `${noun.art} ${noun.noun} ${referencia}` : `${noun.art === "la" ? "una" : "un"} ${noun.noun}`;
  // "de el informe" → "del informe".
  const de = (phrase: string) => (phrase.startsWith("el ") ? `del ${phrase.slice(3)}` : `de ${phrase}`);
  const estado = isPair(cambios.estado) ? cambios.estado : null;
  const facts: string[] = [];
  let action: string;

  switch (accion) {
    case "crear":
      if (detalle.enmienda_de || detalle.enmienda) action = `emitió ${obj} como enmienda (sustituye a la versión anterior)`;
      else if (detalle.nueva_revision_de) action = `creó una nueva revisión ${de(obj)}`;
      else action = `creó ${obj}`;
      break;
    case "editar": {
      const keys = Object.keys(cambios).filter((k) => k !== "_detalle" && !isHidden(k) && k !== "estado_previo");
      if (estado && keys.length === 1) action = `cambió el estado ${de(obj)} a ${humanValue("estado", estado.despues, entidad)}`;
      else if (detalle.avatar) action = "cambió su avatar";
      else if (detalle.contrasena) {
        action = `cambió la contraseña ${de(obj)}`;
        if (keys.length) facts.push(`${keys.length} dato${keys.length === 1 ? "" : "s"} más editado${keys.length === 1 ? "" : "s"}`);
      } else action = `editó ${obj}`;
      break;
    }
    case "anular":
      action = `anuló ${obj}`;
      if (Number(detalle.movimientos_repuestos)) facts.push(`Se repuso el inventario (${Number(detalle.movimientos_repuestos)} movimiento${Number(detalle.movimientos_repuestos) === 1 ? "" : "s"})`);
      break;
    case "restaurar":
      action = `restauró ${obj}`;
      break;
    case "baja":
      action = `dio de baja ${obj}`;
      break;
    case "reactivar":
      action = `reactivó ${obj}`;
      break;
    case "revisar":
      action = `marcó como revisado ${obj}`;
      if (detalle.excepcion) facts.push(exceptionLabel(detalle.excepcion));
      break;
    case "aprobar":
      action = `aprobó ${obj}`;
      if (detalle.excepcion) facts.push(exceptionLabel(detalle.excepcion));
      {
        const obsoletas = Array.isArray(detalle.revisiones_obsoletas) ? detalle.revisiones_obsoletas.length : Number(detalle.revisiones_obsoletas || 0);
        if (obsoletas > 0) facts.push(obsoletas === 1 ? "La revisión anterior quedó obsoleta" : `${obsoletas} revisiones anteriores quedaron obsoletas`);
      }
      break;
    case "autorizar":
      action = `autorizó ${obj}${detalle.pdf ? " y se generó el PDF" : ""}`;
      if (detalle.excepcion) facts.push(exceptionLabel(detalle.excepcion));
      break;
    case "entregar": {
      const to = detalle.a_quien ? ` a ${String(detalle.a_quien)}` : "";
      const medio = detalle.medio ? ` ${DELIVERY_PHRASE[String(detalle.medio)] || `por ${String(detalle.medio)}`}` : "";
      action = `registró la entrega ${de(obj)}${to}${medio}`;
      if (detalle.fecha) facts.push(`Fecha de entrega: ${humanValue("fecha", detalle.fecha)}`);
      break;
    }
    case "rechazar":
      action = `rechazó ${obj}`;
      break;
    case "aceptar":
      action = detalle.decision === "aceptada_con_desviacion" ? `aceptó con desviación ${obj}` : `aceptó ${obj}`;
      break;
    case "cerrar":
      action = `cerró ${obj}`;
      if (detalle.disposicion) facts.push(`Disposición final: ${humanValue("disposicion", detalle.disposicion)}`);
      break;
    case "reponer":
      action = detalle.cantidad ? `repuso ${humanValue("cantidad", detalle.cantidad)} unidades ${de(obj)}` : `repuso existencias ${de(obj)}`;
      break;
    case "importar": {
      const n = Number(detalle.insertados || 0);
      const u = Number(detalle.actualizados || 0);
      action = `importó ${noun.plural} desde un archivo`;
      if (n) facts.push(`${n.toLocaleString("es-MX")} nuevos`);
      if (u) facts.push(`${u.toLocaleString("es-MX")} actualizados`);
      if (Number(detalle.ignorados)) facts.push(`${Number(detalle.ignorados).toLocaleString("es-MX")} filas ignoradas`);
      if (Number(detalle.errores)) facts.push(`${Number(detalle.errores).toLocaleString("es-MX")} con error`);
      break;
    }
    case "eliminar":
      action = `eliminó ${obj}`;
      break;
    case "descargar":
      action = entidad === "informes" ? `descargó el PDF ${de(obj)}` : `descargó ${obj}`;
      break;
    case "login":
      action = "inició sesión";
      if (detalle.proveedor) facts.push(`Acceso con ${providerLabel(detalle.proveedor)}`);
      break;
    case "login_fallido":
      action = `intento de acceso fallido${referencia ? ` con ${referencia}` : ""}`;
      if (detalle.motivo) facts.push(String(detalle.motivo));
      else if (detalle.existe_usuario === false) facts.push("El correo no corresponde a ningún usuario");
      else if (detalle.existe_usuario === true) facts.push("Contraseña incorrecta");
      if (detalle.proveedor) facts.push(`Acceso con ${providerLabel(detalle.proveedor)}`);
      break;
    default:
      action = `${accion} ${obj}`;
  }

  if (estado && accion !== "editar" && accion !== "anular" && accion !== "restaurar") {
    facts.unshift(`Estado: ${humanValue("estado", estado.antes, entidad)} → ${humanValue("estado", estado.despues, entidad)}`);
  }

  const changes = humanChanges(cambios, entidad);
  const route = ENTITY_ROUTE[entidad];
  const href = route !== undefined && (entry.entidad_id || referencia) ? route(String(entry.entidad_id || ""), referencia || "") : null;
  const when = entry.fecha_hora ? new Date(String(entry.fecha_hora)) : null;
  if (!entry.usuario_nombre && !entry.usuario_email && accion === "login_fallido") action = action.charAt(0).toUpperCase() + action.slice(1);

  // Lo que quede en `_detalle` sin traducir se muestra como hecho, para no perder datos.
  for (const [key, value] of Object.entries(detalle)) {
    if (CONSUMED_DETAIL.has(key) || isHidden(key) || value === null || value === undefined || value === "") continue;
    facts.push(`${fieldLabel(key)}: ${humanValue(key, value, entidad)}`);
  }

  return {
    id: Number(entry.id),
    when: when && !Number.isNaN(when.getTime()) ? when : null,
    actor: String(entry.usuario_nombre || entry.usuario_email || (accion === "login_fallido" ? "" : "El sistema")),
    actorEmail: entry.usuario_email ? String(entry.usuario_email) : null,
    isSystem: !entry.usuario_nombre && !entry.usuario_email,
    action,
    verb: accion,
    tone: ACTION_TONE[accion] || "neutral",
    entityLabel: AUDIT_ENTITIES[entidad] || entidad,
    reference: referencia,
    facts,
    motivo: entry.motivo ? String(entry.motivo) : null,
    changes,
    href: accion === "login" || accion === "login_fallido" ? null : href,
    hash: entry.hash ? String(entry.hash) : null,
  };
}

/* "Hoy", "Ayer" o la fecha larga, para agrupar la linea de tiempo. */
export function dayLabel(date: Date | null): string {
  if (!date) return "Sin fecha";
  const today = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startOf(today) - startOf(date)) / 86_400_000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  return date.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" }).replace(/^\w/, (c) => c.toUpperCase());
}

export function timeLabel(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}
