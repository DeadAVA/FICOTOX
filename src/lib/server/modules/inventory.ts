import { requireUser, userIdFromClaims } from "../auth";
import { isIntegrityError, isSqlite, type Row, type Session } from "../db";
import { intParam, json, readJson, type RouteContext } from "../http";
import { ensureMovimientosSchema } from "../inventory-usage";
import { requirePermission } from "../rbac";
import { addColumnIfMissing } from "../schema";
import { ensureConsumiblesSchema } from "./consumables";
import { firstTruthy, isTruthy, searchParam, toFloatOrNull, toIntOrNull, toStrOrNull, utcTimestampReference } from "./helpers";

/* Portado de modules/inventory/endpoints.py del backend Flask original. */

export const REACTIVO_COLUMNS = [
  "id_reactivo",
  "codigo_interno",
  "tipo_reactivo",
  "producto",
  "nombre",
  "marca",
  "proveedor",
  "catalogo",
  "numero_parte",
  "cas",
  "catalogo_parte_cas_lote",
  "localizacion",
  "sub_localizacion",
  "caducidad",
  "fecha_apertura",
  "fecha_ingreso",
  "fecha_preparacion",
  "contenedor",
  "capacidad_litros",
  "capacidad_kilos",
  "capacidad",
  "unidad_capacidad",
  "piezas",
  "total_litros_2025",
  "cantidad_total",
  "unidad_total",
  "restante_190126",
  "restante",
  "lote",
  "parte",
  "serie",
  "descripcion",
  "nuevo_usado",
  "estado",
  "metodo",
  "observaciones",
  "item_name",
  "informacion_extra",
  "nombre_crm",
  "lot_number",
  "url",
  "estado_reactivo",
  "volumen",
  "vendor",
  "amount_in_stock",
  "expiration_date",
  "cas_number",
  "bottle_tag_color",
  "date_opened",
  "formula",
  "id_interno",
  "physical_state",
  "estado_fisico",
  "presentacion",
  "tipo_sustancia",
  "extra_json",
  "numero_cas",
  "categoria",
  "cantidad_actual",
  "unidad",
  "ubicacion",
  "fecha_vencimiento",
  "stock_minimo",
  "stock_maximo",
];

const REACTIVO_SHEET_TYPES: Record<string, string> = {
  acidos: "acidos",
  alcoholes_y_solventes_organicos: "alcoholes_solventes",
  alcoholes_solventes_organicos: "alcoholes_solventes",
  alcoholes_y_solventes: "alcoholes_solventes",
  alcoholes_solventes: "alcoholes_solventes",
  compuestos_de_amonio: "compuestos_amonio",
  compuestos_amonio: "compuestos_amonio",
  compuestos_de_sodio: "compuestos_sodio",
  compuestos_sodio: "compuestos_sodio",
  estandares_preparados: "estandares_preparados",
  materiales_de_referencia: "materiales_referencia",
  materiales_referencia: "materiales_referencia",
  miscelaneos: "miscelaneos",
  columnas_cromatograficas: "columnas_cromatograficas",
};

const REACTIVO_SHEET_LABELS: Record<string, string> = {
  acidos: "Ácidos",
  alcoholes_solventes: "Alcoholes y solventes orgánicos",
  compuestos_amonio: "Compuestos de Amonio",
  compuestos_sodio: "Compuestos de Sodio",
  estandares_preparados: "Estándares preparados",
  materiales_referencia: "Materiales de Referencia",
  miscelaneos: "Misceláneos",
  columnas_cromatograficas: "Columnas cromatográficas",
};

const MONTH_NAMES = new Set([
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "setiembre", "octubre",
  "noviembre", "diciembre",
]);

const REACTIVO_IMPORT_ALIASES: Record<string, string> = {
  id: "codigo_interno",
  id_interno: "codigo_interno",
  codigo_interno: "codigo_interno",
  producto: "nombre",
  item_name: "nombre",
  nombre_del_crm: "nombre",
  nombre_crm: "nombre",
  nombre: "nombre",
  marca: "marca",
  vendor: "proveedor",
  proveedor: "proveedor",
  catalog: "catalogo",
  catalogo: "catalogo",
  catalog_: "catalogo",
  catalog_num: "catalogo",
  catalog_number: "catalogo",
  catalogo_parte_cas_lote: "catalogo_parte_cas_lote",
  catalogo_parte_c_a_s_lote: "catalogo_parte_cas_lote",
  catalogo_parte_cas: "catalogo_parte_cas_lote",
  parte: "numero_parte",
  numero_parte: "numero_parte",
  parte_num: "numero_parte",
  lote: "lote",
  lot_number: "lote",
  cas: "cas",
  cas_number: "cas",
  localizacion: "localizacion",
  location: "localizacion",
  sub_location: "sub_localizacion",
  sub_localizacion: "sub_localizacion",
  caducidad: "caducidad",
  fecha_de_caducidad: "caducidad",
  fecha_caducidad: "caducidad",
  expiration_date: "caducidad",
  fecha_de_apertura: "fecha_apertura",
  fecha_apertura: "fecha_apertura",
  date_opened: "fecha_apertura",
  fecha_de_ingreso: "fecha_ingreso",
  fecha_ingreso: "fecha_ingreso",
  contenedor: "contenedor",
  capacidad_litros: "capacidad",
  capacidad_en_litros: "capacidad",
  capacidad_kilos: "capacidad",
  capacidad_en_kilos: "capacidad",
  piezas: "piezas",
  total_en_litros_2025: "cantidad_total",
  amount_in_stock: "cantidad_total",
  volumen: "cantidad_total",
  restante_al_19_01_26: "restante",
  restante_19_01_26: "restante",
  estado: "estado",
  metodo: "metodo",
  url: "url",
  formula: "formula",
  physical_state: "estado_fisico",
  estado_fisico: "estado_fisico",
  presentacion: "presentacion",
  tipo_de_sustancia: "tipo_sustancia",
  tipo_sustancia: "tipo_sustancia",
  descripcion: "descripcion",
  observaciones: "observaciones",
  informacion_extra: "informacion_extra",
  fecha_de_preparacion: "fecha_preparacion",
  fecha_preparacion: "fecha_preparacion",
  nuevo_o_usado: "nuevo_usado",
  serie: "serie",
  numero_serie: "serie",
};

function normalizeImportKey(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value).trim().toLowerCase().replace(/﻿/g, "");
  text = text.normalize("NFD").replace(/\p{M}/gu, "");
  text = text.replace(/[^a-z0-9]+/g, "_");
  return text.replace(/_+/g, "_").replace(/^_+|_+$/g, "");
}

function reactivoTypeFromSheet(sheetName: string): string | null {
  const normalized = normalizeImportKey(sheetName);
  if (normalized === "consumibles" || normalized.includes("consumible")) return null;
  return REACTIVO_SHEET_TYPES[normalized] || null;
}

function isMonthlyMovementColumn(header: string): boolean {
  const normalized = normalizeImportKey(header);
  const parts = new Set(normalized.split("_"));
  const hasMonth = [...parts].some((part) => MONTH_NAMES.has(part));
  const hasMovementWord = ["descuento", "subtotal", "fecha_del_descuento", "fecha_descuento"].some((word) => normalized.includes(word));
  return hasMonth && hasMovementWord;
}

function cleanImportValue(value: unknown): unknown {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") {
    const cleaned = value.trim();
    return cleaned || null;
  }
  return value;
}

function mapReactivoImportRow(sheetType: string, row: Record<string, unknown>): { mapped: Record<string, unknown>; ignoredColumns: string[] } {
  /*
   * 1. Normalizar cada encabezado: acentos fuera, minusculas, separadores a "_".
   * 2. Ignorar columnas vacias y columnas de movimientos mensuales.
   * 3. Resolver alias conocidos hacia campos canonicos de reactivos.
   * 4. Completar campos derivados usados por pantallas viejas y nuevas.
   */
  const mapped: Record<string, unknown> = { tipo_reactivo: sheetType, categoria: sheetType };
  const ignoredColumns: string[] = [];

  for (const [rawKey, rawValue] of Object.entries(row || {})) {
    const key = normalizeImportKey(rawKey);
    if (!key) {
      ignoredColumns.push(String(rawKey || ""));
      continue;
    }
    if (isMonthlyMovementColumn(key)) {
      ignoredColumns.push(String(rawKey));
      continue;
    }

    let target = REACTIVO_IMPORT_ALIASES[key];
    if (!target) {
      if (key.includes("catalogo") && key.includes("parte") && key.includes("cas")) {
        target = "catalogo_parte_cas_lote";
      } else if (key.startsWith("capacidad") && key.includes("litro")) {
        target = "capacidad";
        mapped.unidad_capacidad = "litros";
      } else if (key.startsWith("capacidad") && (key.includes("kilo") || key.includes("kg"))) {
        target = "capacidad";
        mapped.unidad_capacidad = "kilos";
      } else if (key.includes("restante") && (key.includes("19") || key.includes("01") || key.includes("26"))) {
        target = "restante";
      } else if (key.includes("total") && key.includes("litro")) {
        target = "cantidad_total";
        mapped.unidad_total = sheetType === "compuestos_sodio" ? "kilos" : "litros";
      } else {
        ignoredColumns.push(String(rawKey));
        continue;
      }
    }

    const value = cleanImportValue(rawValue);
    if (value === null) continue;

    mapped[target] = value;

    if (target === "capacidad" && !("unidad_capacidad" in mapped)) {
      mapped.unidad_capacidad = sheetType === "compuestos_sodio" ? "kilos" : "litros";
    }
    if (target === "cantidad_total" && !("unidad_total" in mapped)) {
      mapped.unidad_total = sheetType === "compuestos_sodio" ? "kilos" : "litros";
    }
    if (key === "amount_in_stock") mapped.amount_in_stock = value;
    if (key === "volumen") mapped.volumen = value;
  }

  if (isTruthy(mapped.codigo_interno)) {
    mapped.id_reactivo = mapped.codigo_interno;
    mapped.id_interno = mapped.codigo_interno;
  }
  if (isTruthy(mapped.catalogo)) mapped.catalogo = String(mapped.catalogo);
  if (isTruthy(mapped.numero_parte)) mapped.parte = mapped.numero_parte;
  if (isTruthy(mapped.cas)) {
    mapped.cas_number = mapped.cas;
    mapped.numero_cas = mapped.cas;
  }
  if (isTruthy(mapped.nombre)) {
    mapped.producto = mapped.nombre;
    mapped.item_name = mapped.nombre;
    mapped.nombre_crm = mapped.nombre;
  }
  if (mapped.cantidad_total !== null && mapped.cantidad_total !== undefined) {
    if (["acidos", "alcoholes_solventes", "compuestos_amonio"].includes(sheetType)) {
      mapped.total_litros_2025 = mapped.cantidad_total;
    }
    mapped.amount_in_stock = mapped.cantidad_total;
  }
  if (mapped.restante !== null && mapped.restante !== undefined) mapped.restante_190126 = mapped.restante;
  if (mapped.capacidad !== null && mapped.capacidad !== undefined) {
    if (mapped.unidad_capacidad === "kilos") {
      mapped.capacidad_kilos = mapped.capacidad;
    } else {
      mapped.capacidad_litros = mapped.capacidad;
    }
  }
  if (isTruthy(mapped.estado)) mapped.estado_reactivo = mapped.estado;
  if (isTruthy(mapped.estado_fisico)) mapped.physical_state = mapped.estado_fisico;
  if (isTruthy(mapped.lote) && !isTruthy(mapped.lot_number)) mapped.lot_number = mapped.lote;

  return { mapped, ignoredColumns };
}

function hasReactivoIdentity(data: Record<string, unknown>): boolean {
  return ["nombre", "producto", "codigo_interno", "id_reactivo", "id_interno", "lote", "catalogo_parte_cas_lote", "catalogo"].some((key) => isTruthy(data[key]));
}

const FIND_EXISTING_COLUMNS = ["codigo_interno", "id_reactivo", "id_interno", "catalogo_parte_cas_lote", "catalogo"];

async function findExistingReactivoId(s: Session, data: Record<string, unknown>): Promise<number | null> {
  /*
   * Prioridad de coincidencia:
   * 1. Codigo interno / ID del Excel.
   * 2. Catalogo, lote o cadena catalogo-parte-CAS-lote.
   * 3. Nombre + lote cuando no existe un identificador fuerte.
   */
  const category = firstTruthy(data.tipo_reactivo, data.categoria);
  const checks: Array<[string, unknown]> = [
    ["codigo_interno", firstTruthy(data.codigo_interno, data.id_interno, data.id_reactivo)],
    ["id_reactivo", data.id_reactivo],
    ["id_interno", data.id_interno],
    ["catalogo_parte_cas_lote", data.catalogo_parte_cas_lote],
    ["catalogo", data.catalogo],
  ];
  for (const [column, value] of checks) {
    if (!isTruthy(value) || !FIND_EXISTING_COLUMNS.includes(column)) continue;
    const row = await s.queryOne<{ id: number }>(
      `SELECT id FROM reactivos WHERE tipo_reactivo = :category AND ${column} = :value LIMIT 1`,
      { category, value: String(value) },
    );
    if (row) return Number(row.id);
  }

  if (isTruthy(data.nombre) && isTruthy(data.lote)) {
    const row = await s.queryOne<{ id: number }>(
      "SELECT id FROM reactivos WHERE tipo_reactivo = :category AND nombre = :nombre AND lote = :lote LIMIT 1",
      { category, nombre: data.nombre, lote: data.lote },
    );
    if (row) return Number(row.id);
  }
  return null;
}

export async function ensureReactivosSchema(s: Session): Promise<void> {
  await s.execute(
    isSqlite()
      ? `
      CREATE TABLE IF NOT EXISTS reactivos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre VARCHAR(180) DEFAULT NULL,
          numero_cas VARCHAR(120) DEFAULT NULL,
          categoria VARCHAR(120) DEFAULT NULL,
          cantidad_actual REAL DEFAULT 0,
          unidad VARCHAR(40) DEFAULT NULL,
          ubicacion VARCHAR(180) DEFAULT NULL,
          fecha_vencimiento DATE DEFAULT NULL,
          stock_minimo REAL DEFAULT 0
      )
      `
      : `
      CREATE TABLE IF NOT EXISTS reactivos (
          id INT NOT NULL AUTO_INCREMENT,
          nombre VARCHAR(180) DEFAULT NULL,
          numero_cas VARCHAR(120) DEFAULT NULL,
          categoria VARCHAR(120) DEFAULT NULL,
          cantidad_actual DECIMAL(12,4) DEFAULT 0,
          unidad VARCHAR(40) DEFAULT NULL,
          ubicacion VARCHAR(180) DEFAULT NULL,
          fecha_vencimiento DATE DEFAULT NULL,
          stock_minimo DECIMAL(12,4) DEFAULT 0,
          PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
      `,
  );

  const columnDefinitions: Array<[string, string]> = [
    ["tipo_reactivo", "VARCHAR(80) DEFAULT NULL"],
    ["id_reactivo", "VARCHAR(120) DEFAULT NULL"],
    ["codigo_interno", "VARCHAR(120) DEFAULT NULL"],
    ["producto", "VARCHAR(180) DEFAULT NULL"],
    ["marca", "VARCHAR(120) DEFAULT NULL"],
    ["proveedor", "VARCHAR(180) DEFAULT NULL"],
    ["catalogo", "VARCHAR(120) DEFAULT NULL"],
    ["numero_parte", "VARCHAR(120) DEFAULT NULL"],
    ["cas", "VARCHAR(120) DEFAULT NULL"],
    ["catalogo_parte_cas_lote", "VARCHAR(180) DEFAULT NULL"],
    ["localizacion", "VARCHAR(180) DEFAULT NULL"],
    ["sub_localizacion", "VARCHAR(180) DEFAULT NULL"],
    ["caducidad", "DATE DEFAULT NULL"],
    ["fecha_apertura", "DATE DEFAULT NULL"],
    ["fecha_ingreso", "DATE DEFAULT NULL"],
    ["fecha_preparacion", "DATE DEFAULT NULL"],
    ["contenedor", "VARCHAR(120) DEFAULT NULL"],
    ["capacidad_litros", "DECIMAL(12,4) DEFAULT NULL"],
    ["capacidad_kilos", "DECIMAL(12,4) DEFAULT NULL"],
    ["capacidad", "DECIMAL(12,4) DEFAULT NULL"],
    ["unidad_capacidad", "VARCHAR(40) DEFAULT NULL"],
    ["piezas", "INT DEFAULT NULL"],
    ["total_litros_2025", "DECIMAL(12,4) DEFAULT NULL"],
    ["cantidad_total", "DECIMAL(12,4) DEFAULT NULL"],
    ["unidad_total", "VARCHAR(40) DEFAULT NULL"],
    ["restante_190126", "DECIMAL(12,4) DEFAULT NULL"],
    ["restante", "DECIMAL(12,4) DEFAULT NULL"],
    ["lote", "VARCHAR(120) DEFAULT NULL"],
    ["parte", "VARCHAR(120) DEFAULT NULL"],
    ["serie", "VARCHAR(120) DEFAULT NULL"],
    ["descripcion", "TEXT"],
    ["nuevo_usado", "VARCHAR(30) DEFAULT NULL"],
    ["estado", "VARCHAR(80) DEFAULT NULL"],
    ["metodo", "VARCHAR(120) DEFAULT NULL"],
    ["observaciones", "TEXT"],
    ["item_name", "VARCHAR(180) DEFAULT NULL"],
    ["informacion_extra", "TEXT"],
    ["nombre_crm", "VARCHAR(180) DEFAULT NULL"],
    ["lot_number", "VARCHAR(120) DEFAULT NULL"],
    ["url", "VARCHAR(255) DEFAULT NULL"],
    ["estado_reactivo", "VARCHAR(40) DEFAULT NULL"],
    ["volumen", "VARCHAR(80) DEFAULT NULL"],
    ["vendor", "VARCHAR(180) DEFAULT NULL"],
    ["catalogo", "VARCHAR(120) DEFAULT NULL"],
    ["amount_in_stock", "DECIMAL(12,4) DEFAULT NULL"],
    ["expiration_date", "DATE DEFAULT NULL"],
    ["cas_number", "VARCHAR(120) DEFAULT NULL"],
    ["bottle_tag_color", "VARCHAR(80) DEFAULT NULL"],
    ["date_opened", "DATE DEFAULT NULL"],
    ["formula", "VARCHAR(180) DEFAULT NULL"],
    ["id_interno", "VARCHAR(120) DEFAULT NULL"],
    ["physical_state", "VARCHAR(80) DEFAULT NULL"],
    ["estado_fisico", "VARCHAR(80) DEFAULT NULL"],
    ["presentacion", "VARCHAR(120) DEFAULT NULL"],
    ["tipo_sustancia", "VARCHAR(120) DEFAULT NULL"],
    ["extra_json", "LONGTEXT"],
    ["creado_en", "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP"],
    ["actualizado_en", "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"],
    ["stock_maximo", "DECIMAL(12,4) DEFAULT NULL"],
  ];
  for (const [columnName, columnDefinition] of columnDefinitions) {
    await addColumnIfMissing(s, "reactivos", columnName, columnDefinition);
  }
  await s.execute(
    `
    UPDATE reactivos
    SET stock_maximo = COALESCE(
        capacidad_litros,
        capacidad_kilos,
        cantidad_total,
        total_litros_2025,
        amount_in_stock,
        cantidad_actual,
        piezas,
        volumen
    )
    WHERE stock_maximo IS NULL
      AND COALESCE(
        capacidad_litros,
        capacidad_kilos,
        cantidad_total,
        total_litros_2025,
        amount_in_stock,
        cantidad_actual,
        piezas,
        volumen
      ) IS NOT NULL
    `,
  );
  await s.commit();
}

function strip(value: unknown): string {
  return String(value || "").trim();
}

export function normalizeReactivoPayload(raw: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const payload = raw || {};
  const tipo = strip(payload.tipo_reactivo).slice(0, 80) || null;
  const producto = strip(firstTruthy(payload.producto, payload.item_name, payload.nombre_crm, payload.nombre, "")).slice(0, 180) || null;
  const codigoInterno = toStrOrNull(firstTruthy(payload.codigo_interno, payload.id_reactivo, payload.id_interno), 120);
  const numeroCas = strip(firstTruthy(payload.cas, payload.cas_number, payload.numero_cas, payload.catalogo_parte_cas_lote, "")).slice(0, 120) || null;
  const ubicacion = strip(firstTruthy(payload.localizacion, payload.ubicacion, payload.sub_localizacion, "")).slice(0, 180) || null;
  const fechaVencimiento = firstTruthy(payload.caducidad, payload.expiration_date, payload.fecha_vencimiento, null);
  const amount = toFloatOrNull(payload.amount_in_stock);
  const piezas = toIntOrNull(payload.piezas);
  let capacidad = toFloatOrNull(payload.capacidad);
  let unidadCapacidad = toStrOrNull(payload.unidad_capacidad, 40);
  let capacidadLitros = toFloatOrNull(payload.capacidad_litros);
  let capacidadKilos = toFloatOrNull(payload.capacidad_kilos);
  if (capacidad !== null && !isTruthy(capacidadLitros) && !isTruthy(capacidadKilos)) {
    if (unidadCapacidad === "kilos") {
      capacidadKilos = capacidad;
    } else {
      capacidadLitros = capacidad;
    }
  }
  if (capacidad === null) {
    capacidad = capacidadKilos !== null ? capacidadKilos : capacidadLitros;
    unidadCapacidad = capacidadKilos !== null ? "kilos" : capacidadLitros !== null ? "litros" : unidadCapacidad;
  }
  let cantidadTotal = toFloatOrNull(payload.cantidad_total);
  let totalLitros2025 = toFloatOrNull(payload.total_litros_2025);
  if (cantidadTotal === null) {
    cantidadTotal = totalLitros2025 !== null ? totalLitros2025 : amount;
  }
  if (totalLitros2025 === null && payload.unidad_total === "litros") {
    totalLitros2025 = cantidadTotal;
  }
  const unidadTotal = toStrOrNull(payload.unidad_total, 40);
  let restante = toFloatOrNull(payload.restante);
  let restante190126 = toFloatOrNull(payload.restante_190126);
  if (restante === null) restante = restante190126;
  if (restante190126 === null) restante190126 = restante;
  const volumen = toFloatOrNull(payload.volumen);
  const cantidadActual =
    restante190126 !== null
      ? restante190126
      : amount !== null
        ? amount
        : totalLitros2025 !== null
          ? totalLitros2025
          : piezas !== null
            ? piezas
            : capacidadLitros !== null
              ? capacidadLitros
              : capacidadKilos !== null
                ? capacidadKilos
                : volumen;
  const unidad = firstTruthy(
    payload.unidad,
    unidadTotal,
    restante190126 !== null || totalLitros2025 !== null || capacidadLitros !== null
      ? "L"
      : capacidadKilos !== null
        ? "kg"
        : piezas !== null
          ? "piezas"
          : volumen !== null
            ? "volumen"
            : null,
  );

  const data: Record<string, unknown> = {};
  for (const column of REACTIVO_COLUMNS) {
    data[column] = payload[column] === undefined ? null : payload[column];
  }
  Object.assign(data, {
    id_reactivo: toStrOrNull(firstTruthy(payload.id_reactivo, codigoInterno), 120),
    codigo_interno: codigoInterno,
    tipo_reactivo: tipo,
    producto,
    nombre: producto,
    catalogo: toStrOrNull(payload.catalogo, 120),
    numero_parte: toStrOrNull(payload.numero_parte, 120),
    cas: numeroCas,
    numero_cas: numeroCas,
    categoria: tipo,
    cantidad_actual: cantidadActual,
    unidad,
    ubicacion,
    fecha_vencimiento: fechaVencimiento,
    stock_minimo: firstTruthy(toFloatOrNull(payload.stock_minimo), 0),
    stock_maximo: firstTruthy(
      toFloatOrNull(payload.stock_maximo),
      capacidadLitros,
      capacidadKilos,
      cantidadTotal,
      totalLitros2025,
      amount,
      cantidadActual,
    ),
    capacidad,
    unidad_capacidad: unidadCapacidad,
    capacidad_litros: capacidadLitros,
    capacidad_kilos: capacidadKilos,
    piezas,
    cantidad_total: cantidadTotal,
    unidad_total: unidadTotal,
    total_litros_2025: totalLitros2025,
    restante,
    restante_190126: restante190126,
    amount_in_stock: amount,
    estado: toStrOrNull(firstTruthy(payload.estado, payload.estado_reactivo), 80),
    estado_fisico: toStrOrNull(firstTruthy(payload.estado_fisico, payload.physical_state), 80),
    extra_json: JSON.stringify(payload.extra && typeof payload.extra === "object" ? payload.extra : {}),
  });

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      data[key] = value.trim() || null;
    }
  }
  return data;
}

const REACTIVO_INSERT_COLUMNS = REACTIVO_COLUMNS.join(", ");
const REACTIVO_INSERT_VALUES = REACTIVO_COLUMNS.map((column) => `:${column}`).join(", ");
const REACTIVO_UPDATE_ASSIGNMENTS = REACTIVO_COLUMNS.map((column) => `${column} = :${column}`).join(", ");

export async function inventorySummary({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "dashboard", "read");
  await ensureReactivosSchema(s);
  await ensureConsumiblesSchema(s);
  await ensureEquiposSchema(s);

  const summary = await s.queryOne(
    `
    SELECT
      (SELECT COUNT(*) FROM reactivos) AS total_reactivos,
      (SELECT COUNT(*) FROM consumibles) AS total_consumibles,
      (SELECT COUNT(*) FROM equipos) AS total_equipos,
      (
        SELECT COUNT(*)
        FROM reactivos
        WHERE cantidad_actual <= stock_minimo
      ) AS reactivos_stock_bajo,
      (
        SELECT COUNT(*)
        FROM consumibles
        WHERE piezas <= 5
      ) AS consumibles_stock_bajo,
      (
        SELECT COUNT(*)
        FROM equipos
        WHERE estado = 'calibracion_pendiente'
      ) AS equipos_calibracion_pendiente
    `,
  );
  return json(summary || {});
}

export async function listReactivos({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "reactivos", "read");
  await ensureReactivosSchema(s);

  const search = searchParam(request, "search");
  const rows = await s.query(
    `
    SELECT id, id_reactivo, codigo_interno, tipo_reactivo, producto,
           nombre, marca, proveedor, catalogo, numero_parte, cas,
           catalogo_parte_cas_lote, localizacion, sub_localizacion,
           caducidad, fecha_apertura, fecha_ingreso, fecha_preparacion,
           contenedor, capacidad_litros, capacidad_kilos, capacidad,
           unidad_capacidad, piezas, total_litros_2025, cantidad_total,
           unidad_total, restante_190126, restante, lote, parte,
           serie, descripcion, nuevo_usado, metodo, observaciones,
           item_name, informacion_extra, nombre_crm, lot_number, url,
           estado_reactivo, volumen, vendor, catalogo, amount_in_stock,
           expiration_date, cas_number, bottle_tag_color, date_opened,
           formula, id_interno, physical_state, estado_fisico, presentacion,
           tipo_sustancia, numero_cas, categoria, cantidad_actual,
           unidad, ubicacion, fecha_vencimiento, stock_minimo, stock_maximo
    FROM reactivos
    WHERE :search = ''
       OR nombre LIKE :search_like
       OR producto LIKE :search_like
       OR item_name LIKE :search_like
       OR nombre_crm LIKE :search_like
       OR tipo_reactivo LIKE :search_like
       OR id_interno LIKE :search_like
       OR catalogo_parte_cas_lote LIKE :search_like
    ORDER BY COALESCE(nombre, producto, item_name, nombre_crm) ASC
    LIMIT 500
    `,
    { search, search_like: `%${search}%` },
  );
  return json({ items: rows, total: rows.length });
}

export async function getReactivo({ request, s, params }: RouteContext): Promise<Response> {
  const reactivoId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "reactivos", "read");
  await ensureReactivosSchema(s);

  const row = await s.queryOne("SELECT * FROM reactivos WHERE id = :id", { id: reactivoId });
  if (!row) {
    return json({ message: "Reactivo no encontrado" }, 404);
  }
  return json({ item: row });
}

export async function createReactivo({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "reactivos", "create");
  await ensureReactivosSchema(s);

  const data = normalizeReactivoPayload(await readJson(request));
  if (!data.tipo_reactivo || !data.nombre) {
    return json({ message: "Tipo de reactivo y producto son obligatorios" }, 400);
  }

  const result = await s.execute(`INSERT INTO reactivos (${REACTIVO_INSERT_COLUMNS}) VALUES (${REACTIVO_INSERT_VALUES})`, data);
  await s.commit();
  return json({ message: "Reactivo creado", id: result.lastrowid }, 201);
}

export async function updateReactivo({ request, s, params }: RouteContext): Promise<Response> {
  const reactivoId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "reactivos", "update");
  await ensureReactivosSchema(s);

  const data = normalizeReactivoPayload(await readJson(request));
  if (!data.tipo_reactivo || !data.nombre) {
    return json({ message: "Tipo de reactivo y producto son obligatorios" }, 400);
  }

  const result = await s.execute(`UPDATE reactivos SET ${REACTIVO_UPDATE_ASSIGNMENTS} WHERE id = :id`, { ...data, id: reactivoId });
  await s.commit();
  if (result.rowcount === 0) {
    return json({ message: "Reactivo no encontrado" }, 404);
  }
  return json({ message: "Reactivo actualizado" });
}

export async function refillReactivo({ request, s, params }: RouteContext): Promise<Response> {
  const reactivoId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "reactivos", "update");
  await ensureReactivosSchema(s);
  await ensureMovimientosSchema(s);

  const payload = await readJson(request);
  const amount = toFloatOrNull(payload.cantidad);
  if (amount === null || amount <= 0) {
    return json({ message: "Captura una cantidad mayor a cero" }, 400);
  }

  const row = await s.queryOne<Row>("SELECT * FROM reactivos WHERE id = :id LIMIT 1", { id: reactivoId });
  if (!row) {
    return json({ message: "Reactivo no encontrado" }, 404);
  }

  const updates = ["cantidad_actual = COALESCE(cantidad_actual, 0) + :cantidad"];
  let visibleCurrent: unknown = row.cantidad_actual;
  if (row.restante_190126 !== null && row.restante_190126 !== undefined) {
    updates.push("restante_190126 = COALESCE(restante_190126, 0) + :cantidad", "restante = COALESCE(restante, 0) + :cantidad");
    visibleCurrent = row.restante_190126;
  } else if (row.amount_in_stock !== null && row.amount_in_stock !== undefined) {
    updates.push("amount_in_stock = COALESCE(amount_in_stock, 0) + :cantidad");
    visibleCurrent = row.amount_in_stock;
  } else if (row.total_litros_2025 !== null && row.total_litros_2025 !== undefined) {
    updates.push("total_litros_2025 = COALESCE(total_litros_2025, 0) + :cantidad", "cantidad_total = COALESCE(cantidad_total, 0) + :cantidad");
    visibleCurrent = row.total_litros_2025;
  } else if (row.piezas !== null && row.piezas !== undefined) {
    updates.push("piezas = COALESCE(piezas, 0) + :cantidad");
    visibleCurrent = row.piezas;
  } else if (row.volumen !== null && row.volumen !== undefined) {
    updates.push("volumen = COALESCE(volumen, 0) + :cantidad");
    visibleCurrent = row.volumen;
  } else {
    updates.push("amount_in_stock = COALESCE(amount_in_stock, 0) + :cantidad");
    visibleCurrent = 0;
  }

  const currentAfter = (toFloatOrNull(visibleCurrent) || 0) + amount;
  updates.push(
    `
    stock_maximo = CASE
        WHEN stock_maximo IS NULL OR stock_maximo < :current_after THEN :current_after
        ELSE stock_maximo
    END
    `,
  );

  await s.execute(`UPDATE reactivos SET ${updates.join(", ")} WHERE id = :id`, {
    id: reactivoId,
    cantidad: amount,
    current_after: currentAfter,
  });

  const motivo = String(payload.motivo || "Relleno manual de stock").trim();
  await s.execute(
    `
    INSERT INTO movimientos (tipo, tabla_origen, id_item, cantidad, motivo, referencia, id_usuario)
    VALUES ('entrada', 'reactivos', :id, :cantidad, :motivo, :referencia, :id_usuario)
    `,
    {
      id: reactivoId,
      cantidad: amount,
      motivo,
      referencia: `reactivo-refill-${reactivoId}-${utcTimestampReference()}`,
      id_usuario: userIdFromClaims(user),
    },
  );
  await s.commit();
  return json({ message: "Stock de reactivo rellenado" });
}

export async function importReactivos({ request, s }: RouteContext): Promise<Response> {
  /*
   * 1. Recibir todas las hojas del workbook.
   * 2. Clasificar cada hoja por nombre; ignorar consumibles y hojas desconocidas.
   * 3. Mapear fila por fila; los errores de una fila no detienen la hoja.
   * 4. Normalizar al esquema canonico y hacer insert/update.
   * 5. Regresar resumen operativo para la interfaz.
   */
  const user = await requireUser(request);
  await requirePermission(s, user, "reactivos", "create");
  await ensureReactivosSchema(s);

  const payload = await readJson(request);
  const sheets = payload.sheets;
  if (!Array.isArray(sheets)) {
    return json({ message: "Formato inválido. Envía una lista de hojas." }, 400);
  }

  const summary = {
    total_hojas_leidas: sheets.length,
    hojas_procesadas: [] as Array<Record<string, unknown>>,
    hojas_ignoradas: [] as Array<Record<string, unknown>>,
    reactivos_insertados: 0,
    reactivos_actualizados: 0,
    filas_ignoradas: 0,
    errores: [] as Array<Record<string, unknown>>,
  };

  for (const rawSheet of sheets) {
    const sheet = (rawSheet && typeof rawSheet === "object" ? rawSheet : {}) as Record<string, unknown>;
    const sheetName = String(sheet.name || "").trim();
    const rows = sheet.rows || [];
    const sheetType = reactivoTypeFromSheet(sheetName);

    if (!sheetType) {
      summary.hojas_ignoradas.push({ hoja: sheetName || "Sin nombre", motivo: "No corresponde a reactivos" });
      continue;
    }
    if (!Array.isArray(rows) || !rows.length) {
      summary.hojas_ignoradas.push({ hoja: sheetName, motivo: "Hoja vacía" });
      continue;
    }

    const processedSheet = {
      hoja: sheetName,
      categoria: REACTIVO_SHEET_LABELS[sheetType] || sheetType,
      filas: 0,
      insertados: 0,
      actualizados: 0,
      ignorados: 0,
    };

    for (let i = 0; i < rows.length; i += 1) {
      const index = i + 2;
      const row = rows[i];
      try {
        if (!row || typeof row !== "object" || Array.isArray(row)) {
          processedSheet.ignorados += 1;
          summary.filas_ignoradas += 1;
          summary.errores.push({ hoja: sheetName, fila: index, error: "Fila inválida" });
          continue;
        }

        const { mapped } = mapReactivoImportRow(sheetType, row as Record<string, unknown>);
        if (!hasReactivoIdentity(mapped)) {
          processedSheet.ignorados += 1;
          summary.filas_ignoradas += 1;
          continue;
        }

        const data = normalizeReactivoPayload(mapped);
        if (!data.tipo_reactivo || !data.nombre) {
          processedSheet.ignorados += 1;
          summary.filas_ignoradas += 1;
          summary.errores.push({
            hoja: sheetName,
            fila: index,
            error: "Falta nombre de producto, Item Name o Nombre del CRM",
          });
          continue;
        }

        const existingId = await findExistingReactivoId(s, data);
        if (existingId) {
          await s.execute(`UPDATE reactivos SET ${REACTIVO_UPDATE_ASSIGNMENTS} WHERE id = :id`, { ...data, id: existingId });
          summary.reactivos_actualizados += 1;
          processedSheet.actualizados += 1;
        } else {
          await s.execute(`INSERT INTO reactivos (${REACTIVO_INSERT_COLUMNS}) VALUES (${REACTIVO_INSERT_VALUES})`, data);
          summary.reactivos_insertados += 1;
          processedSheet.insertados += 1;
        }

        processedSheet.filas += 1;
      } catch (error) {
        // Reporte por fila sin romper la importacion completa.
        processedSheet.ignorados += 1;
        summary.filas_ignoradas += 1;
        summary.errores.push({ hoja: sheetName, fila: index, error: error instanceof Error ? error.message : String(error) });
        continue;
      }
    }

    summary.hojas_procesadas.push(processedSheet);
  }

  await s.commit();
  return json({ message: "Importación de reactivos completada", summary });
}

export async function deleteReactivo({ request, s, params }: RouteContext): Promise<Response> {
  const reactivoId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "reactivos", "delete");
  await ensureReactivosSchema(s);

  const result = await s.execute("DELETE FROM reactivos WHERE id = :id", { id: reactivoId });
  await s.commit();
  if (result.rowcount === 0) {
    return json({ message: "Reactivo no encontrado" }, 404);
  }
  return json({ message: "Reactivo eliminado" });
}

// ---------------------------------------------------------------------------
// Equipos y mantenimientos
// ---------------------------------------------------------------------------

export async function ensureEquiposSchema(s: Session): Promise<void> {
  await s.execute(
    isSqlite()
      ? `
      CREATE TABLE IF NOT EXISTS equipos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre VARCHAR(150) NOT NULL,
          marca VARCHAR(100) DEFAULT NULL,
          modelo VARCHAR(100) DEFAULT NULL,
          numero_serie VARCHAR(100) DEFAULT NULL UNIQUE,
          ubicacion VARCHAR(150) DEFAULT NULL,
          id_responsable INTEGER DEFAULT NULL,
          fecha_prox_calibracion DATE DEFAULT NULL,
          estado VARCHAR(40) NOT NULL DEFAULT 'operativo',
          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
      `
      : `
      CREATE TABLE IF NOT EXISTS equipos (
          id INT NOT NULL AUTO_INCREMENT,
          nombre VARCHAR(150) NOT NULL,
          marca VARCHAR(100) DEFAULT NULL,
          modelo VARCHAR(100) DEFAULT NULL,
          numero_serie VARCHAR(100) DEFAULT NULL,
          ubicacion VARCHAR(150) DEFAULT NULL,
          id_responsable INT DEFAULT NULL,
          fecha_prox_calibracion DATE DEFAULT NULL,
          estado ENUM('operativo','mantenimiento','fuera_servicio','calibracion_pendiente') NOT NULL DEFAULT 'operativo',
          creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY numero_serie (numero_serie),
          KEY id_responsable (id_responsable)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
      `,
  );
  for (const [columnName, columnDefinition] of [
    ["marca", "VARCHAR(100) DEFAULT NULL"],
    ["modelo", "VARCHAR(100) DEFAULT NULL"],
    ["numero_serie", "VARCHAR(100) DEFAULT NULL"],
    ["ubicacion", "VARCHAR(150) DEFAULT NULL"],
    ["id_responsable", "INT DEFAULT NULL"],
    ["fecha_prox_calibracion", "DATE DEFAULT NULL"],
    ["estado", "ENUM('operativo','mantenimiento','fuera_servicio','calibracion_pendiente') NOT NULL DEFAULT 'operativo'"],
    ["creado_en", "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP"],
  ] as Array<[string, string]>) {
    await addColumnIfMissing(s, "equipos", columnName, columnDefinition);
  }
  await s.commit();
}

export async function ensureMantenimientosSchema(s: Session): Promise<void> {
  await ensureEquiposSchema(s);
  await s.execute(
    isSqlite()
      ? `
      CREATE TABLE IF NOT EXISTS mantenimientos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          id_equipo INTEGER NOT NULL,
          tipo VARCHAR(40) NOT NULL,
          fecha_programada DATE NOT NULL,
          fecha_realizado DATE DEFAULT NULL,
          tecnico_proveedor VARCHAR(150) DEFAULT NULL,
          estado VARCHAR(40) DEFAULT 'programado',
          observaciones TEXT,
          id_responsable INTEGER DEFAULT NULL,
          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
      `
      : `
      CREATE TABLE IF NOT EXISTS mantenimientos (
          id INT NOT NULL AUTO_INCREMENT,
          id_equipo INT NOT NULL,
          tipo ENUM('preventivo','correctivo','calibracion') NOT NULL,
          fecha_programada DATE NOT NULL,
          fecha_realizado DATE DEFAULT NULL,
          tecnico_proveedor VARCHAR(150) DEFAULT NULL,
          estado ENUM('programado','en_proceso','completado','vencido') DEFAULT 'programado',
          observaciones TEXT,
          id_responsable INT DEFAULT NULL,
          creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY id_equipo (id_equipo),
          KEY id_responsable (id_responsable)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
      `,
  );
  for (const [columnName, columnDefinition] of [
    ["fecha_realizado", "DATE DEFAULT NULL"],
    ["tecnico_proveedor", "VARCHAR(150) DEFAULT NULL"],
    ["estado", "ENUM('programado','en_proceso','completado','vencido') DEFAULT 'programado'"],
    ["observaciones", "TEXT"],
    ["id_responsable", "INT DEFAULT NULL"],
    ["creado_en", "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP"],
  ] as Array<[string, string]>) {
    await addColumnIfMissing(s, "mantenimientos", columnName, columnDefinition);
  }
  await s.execute(
    isSqlite()
      ? `
      CREATE TABLE IF NOT EXISTS reportes_mantenimiento (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          codigo VARCHAR(50) NOT NULL UNIQUE,
          id_mantenimiento INTEGER NOT NULL,
          version VARCHAR(20) NOT NULL,
          estado VARCHAR(40) DEFAULT 'borrador',
          id_responsable INTEGER DEFAULT NULL,
          fecha_reporte DATE NOT NULL,
          archivo_url TEXT,
          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
      `
      : `
      CREATE TABLE IF NOT EXISTS reportes_mantenimiento (
          id INT NOT NULL AUTO_INCREMENT,
          codigo VARCHAR(50) NOT NULL,
          id_mantenimiento INT NOT NULL,
          version VARCHAR(20) NOT NULL,
          estado ENUM('borrador','en_revision','aprobado','publicado') DEFAULT 'borrador',
          id_responsable INT DEFAULT NULL,
          fecha_reporte DATE NOT NULL,
          archivo_url TEXT,
          creado_en TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY codigo (codigo),
          KEY id_mantenimiento (id_mantenimiento),
          KEY id_responsable (id_responsable)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
      `,
  );
  await s.commit();
}

function normalizeEquipoPayload(raw: Record<string, unknown>) {
  const payload = raw || {};
  return {
    nombre: toStrOrNull(payload.nombre, 150),
    marca: toStrOrNull(payload.marca, 100),
    modelo: toStrOrNull(payload.modelo, 100),
    numero_serie: toStrOrNull(payload.numero_serie, 100),
    ubicacion: toStrOrNull(payload.ubicacion, 150),
    id_responsable: toIntOrNull(payload.id_responsable),
    fecha_prox_calibracion: firstTruthy(payload.fecha_prox_calibracion, null),
    estado: firstTruthy(payload.estado, "operativo"),
  };
}

function normalizeMantenimientoPayload(raw: Record<string, unknown>) {
  const payload = raw || {};
  return {
    id_equipo: toIntOrNull(payload.id_equipo),
    tipo: firstTruthy(payload.tipo, "preventivo"),
    fecha_programada: firstTruthy(payload.fecha_programada, null),
    fecha_realizado: firstTruthy(payload.fecha_realizado, null),
    tecnico_proveedor: toStrOrNull(payload.tecnico_proveedor, 150),
    estado: firstTruthy(payload.estado, "programado"),
    observaciones: toStrOrNull(payload.observaciones),
    id_responsable: toIntOrNull(payload.id_responsable),
  };
}

const EQUIPO_SELECT = `
  SELECT e.id, e.nombre, e.marca, e.modelo, e.numero_serie, e.ubicacion,
         e.id_responsable, u.nombre AS responsable,
         e.fecha_prox_calibracion, e.estado, e.creado_en
  FROM equipos e
  LEFT JOIN usuarios u ON u.id = e.id_responsable
`;

export async function listEquipos({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "equipos", "read");
  await ensureEquiposSchema(s);

  const search = searchParam(request, "search");
  const estado = searchParam(request, "estado");
  const rows = await s.query(
    `${EQUIPO_SELECT}
    WHERE (:search = ''
           OR e.nombre LIKE :search_like
           OR e.marca LIKE :search_like
           OR e.modelo LIKE :search_like
           OR e.numero_serie LIKE :search_like
           OR e.ubicacion LIKE :search_like)
      AND (:estado = '' OR e.estado = :estado)
    ORDER BY e.nombre ASC
    LIMIT 500
    `,
    { search, search_like: `%${search}%`, estado },
  );
  return json({ items: rows, total: rows.length });
}

export async function getEquipo({ request, s, params }: RouteContext): Promise<Response> {
  const equipoId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "equipos", "read");
  await ensureEquiposSchema(s);

  const row = await s.queryOne(`${EQUIPO_SELECT} WHERE e.id = :id LIMIT 1`, { id: equipoId });
  if (!row) {
    return json({ message: "Equipo no encontrado" }, 404);
  }
  return json({ item: row });
}

export async function createEquipo({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "equipos", "create");
  await ensureEquiposSchema(s);

  const data = normalizeEquipoPayload(await readJson(request));
  if (!data.nombre) {
    return json({ message: "El nombre del equipo es obligatorio" }, 400);
  }

  let insertedId: number | null;
  try {
    const result = await s.execute(
      `
      INSERT INTO equipos (
        nombre, marca, modelo, numero_serie, ubicacion,
        id_responsable, fecha_prox_calibracion, estado
      )
      VALUES (
        :nombre, :marca, :modelo, :numero_serie, :ubicacion,
        :id_responsable, :fecha_prox_calibracion, :estado
      )
      `,
      { ...data },
    );
    insertedId = result.lastrowid;
    await s.commit();
  } catch (error) {
    if (isIntegrityError(error)) {
      await s.rollback();
      return json({ message: "Ya existe un equipo con ese numero de serie" }, 409);
    }
    throw error;
  }
  return json({ message: "Equipo creado", id: insertedId }, 201);
}

export async function updateEquipo({ request, s, params }: RouteContext): Promise<Response> {
  const equipoId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "equipos", "update");
  await ensureEquiposSchema(s);

  const data = normalizeEquipoPayload(await readJson(request));
  if (!data.nombre) {
    return json({ message: "El nombre del equipo es obligatorio" }, 400);
  }

  let rowcount: number;
  try {
    const result = await s.execute(
      `
      UPDATE equipos
      SET nombre = :nombre,
          marca = :marca,
          modelo = :modelo,
          numero_serie = :numero_serie,
          ubicacion = :ubicacion,
          id_responsable = :id_responsable,
          fecha_prox_calibracion = :fecha_prox_calibracion,
          estado = :estado
      WHERE id = :id
      `,
      { ...data, id: equipoId },
    );
    rowcount = result.rowcount;
    await s.commit();
  } catch (error) {
    if (isIntegrityError(error)) {
      await s.rollback();
      return json({ message: "Ya existe un equipo con ese numero de serie" }, 409);
    }
    throw error;
  }

  if (rowcount === 0) {
    return json({ message: "Equipo no encontrado" }, 404);
  }
  return json({ message: "Equipo actualizado" });
}

export async function deleteEquipo({ request, s, params }: RouteContext): Promise<Response> {
  const equipoId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "equipos", "delete");
  await ensureEquiposSchema(s);

  let rowcount: number;
  try {
    const result = await s.execute("DELETE FROM equipos WHERE id = :id", { id: equipoId });
    rowcount = result.rowcount;
    await s.commit();
  } catch (error) {
    if (isIntegrityError(error)) {
      await s.rollback();
      return json({ message: "No se puede eliminar porque tiene mantenimientos o registros relacionados" }, 409);
    }
    throw error;
  }

  if (rowcount === 0) {
    return json({ message: "Equipo no encontrado" }, 404);
  }
  return json({ message: "Equipo eliminado" });
}

export async function listConsumiblesInventory({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "consumibles", "read");
  await ensureConsumiblesSchema(s);

  const rows = await s.query(
    `
    SELECT id, producto, marca, proveedor, catalogo_parte_cas,
           fecha_ingreso, tamano_capacidad, contenedor, piezas, cantidad_por_pieza
    FROM consumibles
    ORDER BY producto ASC
    LIMIT 200
    `,
  );
  return json({ items: rows, total: rows.length });
}

export async function listMovimientos({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "movimientos", "read");
  await ensureMovimientosSchema(s);

  const rows = await s.query(
    `
    SELECT m.id, m.referencia, m.tipo, m.tabla_origen, m.id_item, m.cantidad,
           m.motivo, m.creado_en AS fecha_hora,
           COALESCE(r.nombre, r.producto, r.item_name, r.nombre_crm, c.producto) AS item_nombre,
           COALESCE(r.codigo_interno, r.id_interno, r.catalogo, r.catalogo_parte_cas_lote, c.catalogo_parte_cas) AS item_codigo
    FROM movimientos m
    LEFT JOIN reactivos r ON m.tabla_origen = 'reactivos' AND m.id_item = r.id
    LEFT JOIN consumibles c ON m.tabla_origen = 'consumibles' AND m.id_item = c.id
    ORDER BY m.creado_en DESC
    LIMIT 200
    `,
  );

  const statsSql = isSqlite()
    ? `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN tabla_origen = 'reactivos' THEN 1 ELSE 0 END) AS reactivos,
        SUM(CASE WHEN tabla_origen = 'consumibles' THEN 1 ELSE 0 END) AS consumibles,
        SUM(CASE WHEN DATE(creado_en) = DATE('now', 'localtime') THEN 1 ELSE 0 END) AS hoy,
        SUM(CASE WHEN strftime('%Y-%W', creado_en) = strftime('%Y-%W', 'now', 'localtime') THEN 1 ELSE 0 END) AS semana,
        SUM(CASE WHEN strftime('%Y-%m', creado_en) = strftime('%Y-%m', 'now', 'localtime') THEN 1 ELSE 0 END) AS mes
      FROM movimientos
    `
    : `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN tabla_origen = 'reactivos' THEN 1 ELSE 0 END) AS reactivos,
        SUM(CASE WHEN tabla_origen = 'consumibles' THEN 1 ELSE 0 END) AS consumibles,
        SUM(CASE WHEN DATE(creado_en) = CURDATE() THEN 1 ELSE 0 END) AS hoy,
        SUM(CASE WHEN YEARWEEK(creado_en, 1) = YEARWEEK(CURDATE(), 1) THEN 1 ELSE 0 END) AS semana,
        SUM(CASE WHEN DATE_FORMAT(creado_en, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m') THEN 1 ELSE 0 END) AS mes
      FROM movimientos
    `;
  const stats = (await s.queryOne<Row>(statsSql)) || {};
  const summary: Record<string, number> = {};
  for (const key of ["total", "reactivos", "consumibles", "hoy", "semana", "mes"]) {
    summary[key] = Number.parseInt(String(stats[key] || 0), 10) || 0;
  }

  return json({ items: rows, total: rows.length, summary });
}

const MANTENIMIENTO_SELECT = `
  SELECT mt.id, mt.id_equipo, mt.tipo, mt.fecha_programada, mt.fecha_realizado,
         mt.tecnico_proveedor, mt.estado, mt.observaciones, mt.id_responsable,
         e.nombre AS equipo, e.marca AS equipo_marca, e.modelo AS equipo_modelo,
         u.nombre AS responsable,
         rm.codigo AS reporte_codigo, rm.archivo_url AS reporte_pdf_url
  FROM mantenimientos mt
  LEFT JOIN equipos e ON e.id = mt.id_equipo
  LEFT JOIN usuarios u ON u.id = mt.id_responsable
  LEFT JOIN (
      SELECT r1.id_mantenimiento, r1.codigo, r1.archivo_url
      FROM reportes_mantenimiento r1
      INNER JOIN (
          SELECT id_mantenimiento, MAX(id) AS id
          FROM reportes_mantenimiento
          GROUP BY id_mantenimiento
      ) latest ON latest.id = r1.id
  ) rm ON rm.id_mantenimiento = mt.id
`;

export async function listMantenimientos({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "mantenimiento", "read");
  await ensureMantenimientosSchema(s);

  const search = searchParam(request, "search");
  const tipo = searchParam(request, "tipo");
  const estado = searchParam(request, "estado");
  const rows = await s.query(
    `${MANTENIMIENTO_SELECT}
    WHERE (:search = ''
           OR e.nombre LIKE :search_like
           OR e.marca LIKE :search_like
           OR e.modelo LIKE :search_like
           OR mt.tecnico_proveedor LIKE :search_like
           OR mt.observaciones LIKE :search_like)
      AND (:tipo = '' OR mt.tipo = :tipo)
      AND (:estado = '' OR mt.estado = :estado)
    ORDER BY mt.fecha_programada ASC, mt.id DESC
    LIMIT 500
    `,
    { search, search_like: `%${search}%`, tipo, estado },
  );
  return json({ items: rows, total: rows.length });
}

export async function getMantenimiento({ request, s, params }: RouteContext): Promise<Response> {
  const mantenimientoId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "mantenimiento", "read");
  await ensureMantenimientosSchema(s);

  const row = await s.queryOne(`${MANTENIMIENTO_SELECT} WHERE mt.id = :id LIMIT 1`, { id: mantenimientoId });
  if (!row) {
    return json({ message: "Mantenimiento no encontrado" }, 404);
  }
  return json({ item: row });
}

export async function createMantenimiento({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "mantenimiento", "create");
  await ensureMantenimientosSchema(s);

  const data = normalizeMantenimientoPayload(await readJson(request));
  if (!data.id_equipo) {
    return json({ message: "Selecciona un equipo" }, 400);
  }
  if (!data.fecha_programada) {
    return json({ message: "La fecha programada es obligatoria" }, 400);
  }

  const result = await s.execute(
    `
    INSERT INTO mantenimientos (
      id_equipo, tipo, fecha_programada, fecha_realizado,
      tecnico_proveedor, estado, observaciones, id_responsable
    )
    VALUES (
      :id_equipo, :tipo, :fecha_programada, :fecha_realizado,
      :tecnico_proveedor, :estado, :observaciones, :id_responsable
    )
    `,
    { ...data },
  );
  await s.commit();
  return json({ message: "Mantenimiento programado", id: result.lastrowid }, 201);
}

export async function updateMantenimiento({ request, s, params }: RouteContext): Promise<Response> {
  const mantenimientoId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "mantenimiento", "update");
  await ensureMantenimientosSchema(s);

  const data = normalizeMantenimientoPayload(await readJson(request));
  if (!data.id_equipo) {
    return json({ message: "Selecciona un equipo" }, 400);
  }
  if (!data.fecha_programada) {
    return json({ message: "La fecha programada es obligatoria" }, 400);
  }

  const result = await s.execute(
    `
    UPDATE mantenimientos
    SET id_equipo = :id_equipo,
        tipo = :tipo,
        fecha_programada = :fecha_programada,
        fecha_realizado = :fecha_realizado,
        tecnico_proveedor = :tecnico_proveedor,
        estado = :estado,
        observaciones = :observaciones,
        id_responsable = :id_responsable
    WHERE id = :id
    `,
    { ...data, id: mantenimientoId },
  );
  await s.commit();
  if (result.rowcount === 0) {
    return json({ message: "Mantenimiento no encontrado" }, 404);
  }
  return json({ message: "Mantenimiento actualizado" });
}

export async function deleteMantenimiento({ request, s, params }: RouteContext): Promise<Response> {
  const mantenimientoId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "mantenimiento", "delete");
  await ensureMantenimientosSchema(s);

  let rowcount: number;
  try {
    const result = await s.execute("DELETE FROM mantenimientos WHERE id = :id", { id: mantenimientoId });
    rowcount = result.rowcount;
    await s.commit();
  } catch (error) {
    if (isIntegrityError(error)) {
      await s.rollback();
      return json({ message: "No se puede eliminar porque tiene reportes relacionados" }, 409);
    }
    throw error;
  }

  if (rowcount === 0) {
    return json({ message: "Mantenimiento no encontrado" }, 404);
  }
  return json({ message: "Mantenimiento eliminado" });
}
