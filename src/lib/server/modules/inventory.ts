import { requireUser, userIdFromClaims } from "../auth";
import { suspensionesActivas } from "./calidad/bloqueos";
import { folioNc } from "../../shared/calidad";
import { registrarAuditoria, snapshotRow } from "../audit";
import { isIntegrityError, isSqlite, type Row, type Session } from "../db";
import { darDeBaja, itemRef, reactivarItem } from "../inventory-baja";
import { HttpError, intParam, json, readJson, type RouteContext } from "../http";

import { cargarAutorizacion, recortarPorModulo, requirePermission } from "../rbac";
import { exigirReauth } from "../seguridad";
import { aplicarSupervision, exigirSinSupervisionPendiente, marcaSupervision } from "../supervision";

import { interpretarMovimiento, tipoDeMovimiento } from "../inventory-movimientos";
import { firstTruthy, isTruthy, searchParam, toFloatOrNull, toIntOrNull, toStrOrNull, utcTimestampReference } from "./helpers";

import { finDiaLocal, hoyLocal, inicioDiaLocal, sumarDias } from "../../shared/fechas";
import { autorizarEquipoA } from "../autorizaciones";

/* Portado de modules/inventory/endpoints.py del backend Flask original. */

const REACTIVO_COLUMNS = [
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
  "caducidad_indefinida",
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

/* Instante ISO -> "AAAA-MM-DD HH:MM:SS" en UTC, como guardan CURRENT_TIMESTAMP SQLite y MySQL. */
const sqlInstante = (iso: string) => iso.slice(0, 19).replace("T", " ");

function cleanImportValue(value: unknown): unknown {
  if (value === null || value === undefined || value === "") return null;
  // Fecha de una celda Excel: el dia segun sus getters locales (toISOString la correria un dia en UTC-7).
  if (value instanceof Date) return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
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

function strip(value: unknown): string {
  return String(value || "").trim();
}

function normalizeReactivoLegacy(raw: Record<string, unknown> | null | undefined): Record<string, unknown> {
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
  // Si la hoja manda la cantidad explícita (sección Existencias), esa manda sobre las columnas heredadas.
  const cantidadExplicita = toFloatOrNull(payload.cantidad_actual);
  const cantidadActual =
    cantidadExplicita !== null
      ? cantidadExplicita
      : restante190126 !== null
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
    // Sin capacidad capturada, el máximo es la cantidad actual explícita (lo que promete la hoja);
    // las capacidades heredadas del Excel solo aplican a registros importados.
    stock_maximo: firstTruthy(toFloatOrNull(payload.stock_maximo), cantidadExplicita, capacidadLitros, capacidadKilos, cantidadTotal, totalLitros2025, amount, cantidadActual),
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

/* Catálogos del formulario de Reactivos (Inventario General del laboratorio). */
const UNIDADES_REACTIVO = ["L", "mL", "kg", "g"];
const CONDICIONES_COLUMNA = ["Nueva", "Usada"];
const METODOS_COLUMNA = ["PSP", "DSP", "ASP", "Otro"];

class ReactivoInvalido extends Error {}

function numeroNoNegativo(valor: unknown, etiqueta: string): number | null {
  if (valor === null || valor === undefined || String(valor).trim() === "") return null;
  const n = toFloatOrNull(valor);
  if (n === null || n < 0) throw new ReactivoInvalido(`«${etiqueta}» debe ser un número mayor o igual a cero`);
  return n;
}

/*
 * Reactivos con el conjunto de campos vigente. Las columnas cromatográficas no
 * llevan cantidad ni existencias. Las columnas heredadas del Excel no se capturan:
 * si el registro ya las tenía (`raw` viene mezclado con lo guardado) se conservan tal cual.
 * La existencia (`cantidad_actual`) solo se inicializa al crear (capacidad × piezas);
 * después cambia únicamente con movimientos.
 */
function normalizeReactivoPayload(raw: Record<string, unknown> | null | undefined, antes?: Record<string, unknown> | null): Record<string, unknown> {
  const payload = raw || {};
  const tipo = strip(payload.tipo_reactivo).slice(0, 80) || null;
  const producto = strip(firstTruthy(payload.producto, payload.item_name, payload.nombre_crm, payload.nombre, "")).slice(0, 180) || null;
  const esColumna = tipo === "columnas_cromatograficas";
  const idInterno = toStrOrNull(firstTruthy(payload.id_interno, payload.codigo_interno, payload.id_reactivo), 120);
  const localizacion = toStrOrNull(firstTruthy(payload.localizacion, payload.ubicacion), 180);
  const data: Record<string, unknown> = {};
  for (const column of REACTIVO_COLUMNS) data[column] = payload[column] === undefined ? null : payload[column];

  const indefinida = [1, true, "1", "true", "on"].includes(payload.caducidad_indefinida as never);
  const caducidad = indefinida ? null : toStrOrNull(firstTruthy(payload.caducidad, payload.expiration_date, payload.fecha_vencimiento), 20);
  Object.assign(data, {
    tipo_reactivo: tipo,
    categoria: tipo,
    producto,
    nombre: producto,
    item_name: null,
    nombre_crm: null,
    id_interno: idInterno,
    id_reactivo: idInterno,
    codigo_interno: idInterno,
    marca: toStrOrNull(payload.marca, 120),
    proveedor: toStrOrNull(payload.proveedor, 180),
    localizacion,
    ubicacion: localizacion,
    lote: toStrOrNull(firstTruthy(payload.lote, payload.lot_number), 120),
    fecha_ingreso: toStrOrNull(payload.fecha_ingreso, 20),
    fecha_apertura: toStrOrNull(payload.fecha_apertura, 20),
    observaciones: toStrOrNull(payload.observaciones, 4000),
    caducidad_indefinida: !esColumna && indefinida ? 1 : 0,
    caducidad: esColumna ? null : caducidad,
    expiration_date: esColumna ? null : caducidad,
    fecha_vencimiento: esColumna ? null : caducidad,
    extra_json: JSON.stringify(payload.extra && typeof payload.extra === "object" ? payload.extra : {}),
  });

  if (esColumna) {
    const condicion = toStrOrNull(payload.nuevo_usado, 30);
    const metodo = toStrOrNull(payload.metodo, 120);
    if (condicion && !CONDICIONES_COLUMNA.includes(condicion)) throw new ReactivoInvalido("La condición de la columna debe ser Nueva o Usada");
    if (metodo && !METODOS_COLUMNA.includes(metodo)) throw new ReactivoInvalido("El método debe ser PSP, DSP, ASP u Otro");
    const parte = toStrOrNull(firstTruthy(payload.parte, payload.numero_parte), 120);
    Object.assign(data, {
      parte,
      numero_parte: parte,
      serie: toStrOrNull(payload.serie, 120),
      descripcion: toStrOrNull(payload.descripcion, 1000),
      nuevo_usado: condicion,
      metodo,
      cas: null,
      numero_cas: null,
      catalogo: null,
      contenedor: null,
      capacidad: null,
      unidad_capacidad: null,
      piezas: null,
      stock_minimo: null,
    });
  } else {
    const cas = toStrOrNull(firstTruthy(payload.cas, payload.cas_number, payload.numero_cas), 120);
    const unidadCapacidad = toStrOrNull(payload.unidad_capacidad, 40);
    if (unidadCapacidad && !UNIDADES_REACTIVO.includes(unidadCapacidad)) throw new ReactivoInvalido("La unidad de la capacidad debe ser L, mL, kg o g");
    const capacidad = numeroNoNegativo(payload.capacidad, "Capacidad por envase");
    if (capacidad !== null && !unidadCapacidad) throw new ReactivoInvalido("Elige la unidad de la capacidad por envase");
    const piezas = numeroNoNegativo(payload.piezas, "Piezas");
    const stockMinimo = numeroNoNegativo(payload.stock_minimo, "Stock mínimo");
    const total = capacidad !== null && piezas !== null ? Math.round(capacidad * piezas * 1e6) / 1e6 : null;
    Object.assign(data, {
      catalogo: toStrOrNull(payload.catalogo, 120),
      cas,
      numero_cas: cas,
      contenedor: toStrOrNull(payload.contenedor, 120),
      capacidad,
      unidad_capacidad: unidadCapacidad,
      piezas,
      stock_minimo: stockMinimo,
      cantidad_total: total,
      unidad_total: total !== null ? unidadCapacidad : toStrOrNull(payload.unidad_total, 40),
      unidad: unidadCapacidad || toStrOrNull(payload.unidad, 40),
    });
    if (antes) {
      // La existencia solo cambia con movimientos; la referencia del medidor nunca baja de la existencia.
      const actual = toFloatOrNull(antes.cantidad_actual);
      data.cantidad_actual = actual;
      data.stock_maximo = firstTruthy(total !== null && actual !== null ? Math.max(total, actual) : total, toFloatOrNull(antes.stock_maximo), actual);
    } else {
      data.cantidad_actual = total !== null ? total : 0;
      data.stock_maximo = total;
    }
  }
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") data[key] = value.trim() || null;
  }
  return data;
}

const REACTIVO_INSERT_COLUMNS = REACTIVO_COLUMNS.join(", ");
const REACTIVO_INSERT_VALUES = REACTIVO_COLUMNS.map((column) => `:${column}`).join(", ");
const REACTIVO_UPDATE_ASSIGNMENTS = REACTIVO_COLUMNS.map((column) => `${column} = :${column}`).join(", ");

export async function inventorySummary({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const auth = await cargarAutorizacion(s, user);

  // Las mismas reglas que usan las listas (ver `isReactivoLow` en el cliente y el filtro
  // "Con alerta de calibración"): así el aviso del Inicio siempre coincide con lo que se ve al abrirlo.
  // Dia local del laboratorio (date('now')/CURDATE() darian el dia UTC del servidor).
  const today = ":hoy";
  const summary = await s.queryOne(
    `
    SELECT
      (SELECT COUNT(*) FROM reactivos WHERE COALESCE(activo, 1) = 1) AS total_reactivos,
      (SELECT COUNT(*) FROM consumibles WHERE COALESCE(activo, 1) = 1) AS total_consumibles,
      (SELECT COUNT(*) FROM equipos WHERE COALESCE(activo, 1) = 1) AS total_equipos,
      (
        SELECT COUNT(*)
        FROM reactivos
        WHERE COALESCE(activo, 1) = 1
          AND cantidad_actual IS NOT NULL
          AND (
            cantidad_actual <= 0
            OR (COALESCE(stock_minimo, 0) > 0 AND cantidad_actual <= stock_minimo)
            OR (COALESCE(stock_minimo, 0) <= 0 AND COALESCE(stock_maximo, 0) > 0 AND cantidad_actual <= stock_maximo * 0.2)
          )
      ) AS reactivos_stock_bajo,
      (
        SELECT COUNT(*)
        FROM consumibles
        WHERE COALESCE(activo, 1) = 1 AND COALESCE(piezas, 0) <= CASE WHEN COALESCE(stock_minimo, 0) > 0 THEN stock_minimo ELSE 5 END
      ) AS consumibles_stock_bajo,
      (
        SELECT COUNT(*)
        FROM equipos
        WHERE COALESCE(activo, 1) = 1
          AND (estado IN ('calibracion_pendiente', 'fuera_servicio') OR (fecha_prox_calibracion IS NOT NULL AND fecha_prox_calibracion < ${today}))
      ) AS equipos_calibracion_pendiente
    `,
    { hoy: hoyLocal() },
  );
  return json(recortarPorModulo(auth, summary || {}, { total_reactivos: "inventario", total_consumibles: "inventario", reactivos_stock_bajo: "inventario", consumibles_stock_bajo: "inventario", total_equipos: "equipos", equipos_calibracion_pendiente: "equipos" }));
}

export async function listReactivos({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "inventario", "V");

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
           unidad, ubicacion, fecha_vencimiento, stock_minimo, stock_maximo,
           activo, baja_motivo, baja_en, caducidad_indefinida
    FROM reactivos
    WHERE (:incluir_bajas = 1 OR COALESCE(activo, 1) = 1)
      AND (:search = ''
       OR nombre LIKE :search_like
       OR producto LIKE :search_like
       OR item_name LIKE :search_like
       OR nombre_crm LIKE :search_like
       OR tipo_reactivo LIKE :search_like
       OR id_interno LIKE :search_like
       OR lote LIKE :search_like
       OR cas LIKE :search_like
       OR catalogo LIKE :search_like
       OR localizacion LIKE :search_like
       OR catalogo_parte_cas_lote LIKE :search_like)
    ORDER BY COALESCE(nombre, producto, item_name, nombre_crm) ASC
    LIMIT 500
    `,
    { search, search_like: `%${search}%`, incluir_bajas: searchParam(request, "bajas") === "1" ? 1 : 0 },
  );
  return json({ items: rows, total: rows.length });
}

export async function getReactivo({ request, s, params }: RouteContext): Promise<Response> {
  const reactivoId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "inventario", "V");

  const row = await s.queryOne("SELECT * FROM reactivos WHERE id = :id", { id: reactivoId });
  if (!row) {
    return json({ message: "Reactivo no encontrado" }, 404);
  }
  return json({ item: row });
}

export async function createReactivo({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const supervision = marcaSupervision(await requirePermission(s, user, "inventario", "C", { objeto: "catalogo_inventario" }));

  let data: Record<string, unknown>;
  try {
    data = normalizeReactivoPayload(await readJson(request));
  } catch (err) {
    if (err instanceof ReactivoInvalido) return json({ message: err.message }, 400);
    throw err;
  }
  if (!data.tipo_reactivo || !data.nombre) {
    return json({ message: "Tipo de reactivo y producto son obligatorios" }, 400);
  }

  const result = await s.execute(`INSERT INTO reactivos (${REACTIVO_INSERT_COLUMNS}) VALUES (${REACTIVO_INSERT_VALUES})`, data);
  const id = result.lastrowid as number;
  const inicial = toFloatOrNull(data.cantidad_total);
  if (inicial !== null && inicial > 0) {
    await s.execute(
      `INSERT INTO movimientos (tipo, tabla_origen, id_item, cantidad, motivo, referencia, id_usuario, unidad)
       VALUES ('entrada', 'reactivos', :id, :cantidad, 'Existencia inicial', :referencia, :id_usuario, :unidad)`,
      { id, cantidad: inicial, referencia: `reactivo-inicial-${id}`, id_usuario: userIdFromClaims(user), unidad: data.unidad_total },
    );
  }
  await aplicarSupervision(s, "reactivos", id, supervision, userIdFromClaims(user));
  await registrarAuditoria(s, user, { accion: "crear", entidad: "reactivos", entidadId: id, referencia: reactivoRef(data), despues: await snapshotRow(s, "reactivos", id) });
  await s.commit();
  return json({ message: "Reactivo creado", id }, 201);
}

const reactivoRef = (row: Record<string, unknown> | null | undefined): string => itemRef("reactivos", row);

export async function updateReactivo({ request, s, params }: RouteContext): Promise<Response> {
  const reactivoId = intParam(params.id);
  const user = await requireUser(request);
  const supervision = marcaSupervision(await requirePermission(s, user, "inventario", "E", { objeto: "catalogo_inventario" }));

  const antes = await snapshotRow(s, "reactivos", reactivoId);
  if (!antes) {
    return json({ message: "Reactivo no encontrado" }, 404);
  }
  // Solo se sobrescribe lo que la hoja manda: las columnas heredadas (Excel) que no aparecen en
  // esa categoría se conservan en vez de quedar en null.
  const incoming = await readJson(request);
  const merged: Record<string, unknown> = { ...antes };
  for (const [key, value] of Object.entries(incoming || {})) if (value !== undefined) merged[key] = value;
  // Si la categoría nombra al producto con otra columna (item_name, nombre_crm), el nombre viejo no debe ganar.
  if (incoming?.producto === undefined && (incoming?.item_name !== undefined || incoming?.nombre_crm !== undefined)) {
    delete merged.producto;
    delete merged.nombre;
  }
  let data: Record<string, unknown>;
  try {
    data = normalizeReactivoPayload(merged, antes);
  } catch (err) {
    if (err instanceof ReactivoInvalido) return json({ message: err.message }, 400);
    throw err;
  }
  if (!data.tipo_reactivo || !data.nombre) {
    return json({ message: "Tipo de reactivo y producto son obligatorios" }, 400);
  }
  const result = await s.execute(`UPDATE reactivos SET ${REACTIVO_UPDATE_ASSIGNMENTS} WHERE id = :id`, { ...data, id: reactivoId });
  if (result.rowcount === 0) {
    await s.rollback();
    return json({ message: "Reactivo no encontrado" }, 404);
  }
  await aplicarSupervision(s, "reactivos", reactivoId, supervision, userIdFromClaims(user));
  await registrarAuditoria(s, user, { accion: "editar", entidad: "reactivos", entidadId: reactivoId, referencia: reactivoRef(data), antes, despues: await snapshotRow(s, "reactivos", reactivoId) });
  await s.commit();
  return json({ message: "Reactivo actualizado" });
}

export async function refillReactivo({ request, s, params }: RouteContext): Promise<Response> {
  const reactivoId = intParam(params.id);
  const user = await requireUser(request);
  const supervision = marcaSupervision(await requirePermission(s, user, "inventario", "C", { objeto: "movimiento" }));

  const payload = await readJson(request);
  // Corregir la existencia por conteo es una edición: pide además el permiso de editar movimientos.
  if (tipoDeMovimiento(payload) === "ajuste") await requirePermission(s, user, "inventario", "E", { objeto: "movimiento" });
  const row = await s.queryOne<Row>("SELECT * FROM reactivos WHERE id = :id LIMIT 1", { id: reactivoId });
  if (!row) {
    return json({ message: "Reactivo no encontrado" }, 404);
  }
  if (row.tipo_reactivo === "columnas_cromatograficas") {
    return json({ message: "Las columnas cromatográficas no llevan existencias" }, 400);
  }

  // `cantidad_actual` es la existencia canónica; las columnas heredadas solo se acompañan
  // cuando ya la reflejaban (mismo valor), para no inventar existencias en piezas o volumen.
  const current = toFloatOrNull(row.cantidad_actual) || 0;
  const mov = await interpretarMovimiento(s, payload, current);
  const updates = ["cantidad_actual = COALESCE(cantidad_actual, 0) + :delta"];
  for (const legacy of ["restante_190126", "amount_in_stock"]) {
    const value = toFloatOrNull(row[legacy]);
    if (value !== null && Math.abs(value - current) < 1e-9) updates.push(`${legacy} = COALESCE(${legacy}, 0) + :delta`);
  }
  const currentAfter = current + mov.delta;
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
    delta: mov.delta,
    current_after: currentAfter,
  });

  await s.execute(
    `
    INSERT INTO movimientos (tipo, tabla_origen, id_item, cantidad, motivo, referencia, id_usuario, unidad, vinculo_tipo, vinculo_id)
    VALUES (:tipo, 'reactivos', :id, :cantidad, :motivo, :referencia, :id_usuario, :unidad, :vinculo_tipo, :vinculo_id)
    `,
    {
      tipo: mov.tipo,
      id: reactivoId,
      cantidad: mov.cantidad,
      motivo: mov.motivo,
      referencia: `reactivo-${mov.tipo}-${reactivoId}-${utcTimestampReference()}`,
      id_usuario: userIdFromClaims(user),
      unidad: row.unidad || null,
      vinculo_tipo: mov.vinculoTipo,
      vinculo_id: mov.vinculoId,
    },
  );
  await aplicarSupervision(s, "reactivos", reactivoId, supervision, userIdFromClaims(user));
  await registrarAuditoria(s, user, { accion: "reponer", entidad: "reactivos", entidadId: reactivoId, referencia: reactivoRef(row), motivo: mov.motivo, antes: row, despues: await snapshotRow(s, "reactivos", reactivoId), detalle: { tipo: mov.tipo, cantidad: mov.cantidad, existencia_anterior: current, existencia_nueva: currentAfter } });
  await s.commit();
  return json({ message: mov.tipo === "ajuste" ? "Existencia ajustada" : "Movimiento registrado" });
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
  // La importacion masiva no se hace bajo supervision (no hay visto bueno por fila).
  if (marcaSupervision(await requirePermission(s, user, "inventario", "C", { objeto: "catalogo_inventario" }))) throw new HttpError(403, { message: "La importación masiva no está disponible para capturas bajo supervisión" });

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

        const data = normalizeReactivoLegacy(mapped);
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

  await registrarAuditoria(s, user, { accion: "importar", entidad: "reactivos", referencia: "importacion Excel", detalle: { insertados: summary.reactivos_insertados, actualizados: summary.reactivos_actualizados, ignorados: summary.filas_ignoradas, errores: summary.errores.length, hojas: summary.hojas_procesadas.map((h) => h.hoja) } });
  await s.commit();
  return json({ message: "Importación de reactivos completada", summary });
}

/* Baja logica: el reactivo deja de ofrecerse pero sus movimientos y registros siguen apuntando a el. */
export async function deleteReactivo({ request, s, params }: RouteContext): Promise<Response> {
  const reactivoId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "inventario", "AN");
  return darDeBaja(s, user, "reactivos", reactivoId, await readJson(request), "Reactivo", request);
}

export async function reactivarReactivo({ request, s, params }: RouteContext): Promise<Response> {
  const reactivoId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "inventario", "G");
  return reactivarItem(s, user, "reactivos", reactivoId, await readJson(request), "Reactivo", request);
}

// ---------------------------------------------------------------------------
// Equipos y mantenimientos
// ---------------------------------------------------------------------------

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
    clave_bitacora: toStrOrNull(payload.clave_bitacora, 60),
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

/* Incluye el siguiente mantenimiento pendiente (tipo, fecha y estado) para explicar el estado del equipo. */
const EQUIPO_SELECT = `
  SELECT e.id, e.nombre, e.marca, e.modelo, e.numero_serie, e.ubicacion,
         e.id_responsable, u.nombre AS responsable,
         e.fecha_prox_calibracion, e.estado, e.clave_bitacora, e.activo, e.baja_motivo, e.baja_en, e.creado_en, e.ultimo_folio_bitacora,
         mp.tipo AS mantenimiento_tipo, mp.fecha_programada AS mantenimiento_fecha, mp.estado AS mantenimiento_estado,
         (SELECT COUNT(*) FROM mantenimientos mx WHERE mx.id_equipo = e.id AND mx.estado IN ('programado', 'en_proceso', 'vencido')) AS mantenimientos_pendientes
  FROM equipos e
  LEFT JOIN usuarios u ON u.id = e.id_responsable
  LEFT JOIN mantenimientos mp ON mp.id = (
    SELECT m1.id FROM mantenimientos m1
    WHERE m1.id_equipo = e.id AND m1.estado IN ('programado', 'en_proceso', 'vencido')
    ORDER BY m1.fecha_programada ASC, m1.id ASC LIMIT 1
  )
`;

export async function listEquipos({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "equipos", "V");

  const search = searchParam(request, "search");
  const estado = searchParam(request, "estado");
  const rows = await s.query(
    `${EQUIPO_SELECT}
    WHERE (:incluir_bajas = 1 OR COALESCE(e.activo, 1) = 1)
      AND (:search = ''
           OR e.nombre LIKE :search_like
           OR e.marca LIKE :search_like
           OR e.modelo LIKE :search_like
           OR e.numero_serie LIKE :search_like
           OR e.ubicacion LIKE :search_like)
      AND (:estado = '' OR e.estado = :estado)
    ORDER BY e.nombre ASC
    LIMIT 500
    `,
    { search, search_like: `%${search}%`, estado, incluir_bajas: searchParam(request, "bajas") === "1" ? 1 : 0 },
  );
  return json({ items: rows, total: rows.length });
}

export async function getEquipo({ request, s, params }: RouteContext): Promise<Response> {
  const equipoId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "equipos", "V");

  const row = await s.queryOne(`${EQUIPO_SELECT} WHERE e.id = :id LIMIT 1`, { id: equipoId });
  if (!row) {
    return json({ message: "Equipo no encontrado" }, 404);
  }
  return json({ item: row });
}

export async function createEquipo({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const supervision = marcaSupervision(await requirePermission(s, user, "equipos", "C", { objeto: "equipo" }));

  const payload = await readJson(request);
  const data = normalizeEquipoPayload(payload);
  if (!data.nombre) {
    return json({ message: "El nombre del equipo es obligatorio" }, 400);
  }
  const autorizarA = Array.isArray(payload.autorizar_a) ? (payload.autorizar_a as unknown[]) : [];

  let insertedId: number | null;
  let autorizacion: Awaited<ReturnType<typeof autorizarEquipoA>> | null = null;
  try {
    const result = await s.execute(
      `
      INSERT INTO equipos (
        nombre, marca, modelo, numero_serie, ubicacion,
        id_responsable, fecha_prox_calibracion, estado, clave_bitacora
      )
      VALUES (
        :nombre, :marca, :modelo, :numero_serie, :ubicacion,
        :id_responsable, :fecha_prox_calibracion, :estado, :clave_bitacora
      )
      `,
      { ...data },
    );
    insertedId = result.lastrowid;
    if (insertedId) await aplicarSupervision(s, "equipos", insertedId, supervision, userIdFromClaims(user));
    await registrarAuditoria(s, user, { accion: "crear", entidad: "equipos", entidadId: insertedId, referencia: String(data.nombre), despues: await snapshotRow(s, "equipos", insertedId) });
    // Fase 5: "Autorizar a…" otorga la autorizacion FX-THF-AP del equipo en el mismo paso.
    if (insertedId && autorizarA.length) autorizacion = await autorizarEquipoA(s, request, user, insertedId, autorizarA, payload.folio_fx_thf_ap);
    await s.commit();
  } catch (error) {
    if (isIntegrityError(error)) {
      await s.rollback();
      return json({ message: "Ya existe un equipo con ese numero de serie" }, 409);
    }
    throw error;
  }
  return json({ message: "Equipo creado", id: insertedId, autorizados: autorizacion?.autorizados || [], omitidos: autorizacion?.omitidos || [] }, 201);
}

export async function updateEquipo({ request, s, params }: RouteContext): Promise<Response> {
  const equipoId = intParam(params.id);
  const user = await requireUser(request);
  const supervision = marcaSupervision(await requirePermission(s, user, "equipos", "E", { objeto: "equipo" }));

  const data = normalizeEquipoPayload(await readJson(request));
  if (!data.nombre) {
    return json({ message: "El nombre del equipo es obligatorio" }, 400);
  }
  // Fase 11: un equipo suspendido por una NC sigue "fuera de servicio" hasta que Calidad lo reanude.
  const suspendido = await suspensionesActivas(s, { tipo: "equipo", clave: String(equipoId) });
  if (suspendido.length && data.estado !== "fuera_servicio") {
    return json({ message: `El equipo está suspendido por ${[...new Set(suspendido.map((x) => folioNc(x.nc_folio)))].join(", ")}; su estado no cambia hasta que Calidad lo reanude`, codigo: "suspendido" }, 409);
  }

  let rowcount: number;
  const antes = await snapshotRow(s, "equipos", equipoId);
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
          estado = :estado,
          clave_bitacora = :clave_bitacora
      WHERE id = :id
      `,
      { ...data, id: equipoId },
    );
    rowcount = result.rowcount;
    if (rowcount > 0) {
      // El estado manual no puede contradecir a Mantenimiento: si hay uno pendiente, queda "en mantenimiento".
      await syncEquipoEstado(s, equipoId);
      await aplicarSupervision(s, "equipos", equipoId, supervision, userIdFromClaims(user));
      await registrarAuditoria(s, user, { accion: "editar", entidad: "equipos", entidadId: equipoId, referencia: String(data.nombre), antes, despues: await snapshotRow(s, "equipos", equipoId) });
    }
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

/* Baja logica del equipo: conserva mantenimientos, bitacoras y registros que lo citan. */
export async function deleteEquipo({ request, s, params }: RouteContext): Promise<Response> {
  const equipoId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "equipos", "AN");
  return darDeBaja(s, user, "equipos", equipoId, await readJson(request), "Equipo", request);
}

export async function reactivarEquipo({ request, s, params }: RouteContext): Promise<Response> {
  const equipoId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "equipos", "G");
  return reactivarItem(s, user, "equipos", equipoId, await readJson(request), "Equipo", request);
}

export async function listConsumiblesInventory({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "inventario", "V");

  const rows = await s.query(
    `
    SELECT id, id_interno, producto, marca, proveedor, catalogo_parte_cas, lote,
           fecha_ingreso, tamano_capacidad, contenedor, piezas, cantidad_por_pieza,
           localizacion, stock_minimo, observaciones
    FROM consumibles
    ORDER BY producto ASC
    LIMIT 200
    `,
  );
  return json({ items: rows, total: rows.length });
}

export async function listMovimientos({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "inventario", "V");

  const rows = await s.query(
    `
    SELECT m.id, m.referencia, m.tipo, m.tabla_origen, m.id_item, m.cantidad,
           m.motivo, m.creado_en AS fecha_hora, m.unidad, m.vinculo_tipo, m.vinculo_id,
           u.nombre AS usuario,
           COALESCE(r.nombre, r.producto, r.item_name, r.nombre_crm, c.producto) AS item_nombre,
           COALESCE(r.codigo_interno, r.id_interno, c.id_interno, r.catalogo, r.catalogo_parte_cas_lote, c.catalogo_parte_cas) AS item_codigo
    FROM movimientos m
    LEFT JOIN reactivos r ON m.tabla_origen = 'reactivos' AND m.id_item = r.id
    LEFT JOIN consumibles c ON m.tabla_origen = 'consumibles' AND m.id_item = c.id
    LEFT JOIN usuarios u ON u.id = m.id_usuario
    ORDER BY m.creado_en DESC
    LIMIT 200
    `,
  );

  // Fase 3: "hoy", "semana" y "mes" son del calendario del laboratorio (America/Tijuana); creado_en esta en UTC.
  const hoyLab = hoyLocal();
  const dia = (hoyLab.length === 10 ? new Date(`${hoyLab}T12:00:00Z`).getUTCDay() : 1) || 7;
  const lunes = sumarDias(hoyLab, 1 - dia);
  const primeroMes = `${hoyLab.slice(0, 8)}01`;
  const limites = {
    hoy_ini: sqlInstante(inicioDiaLocal(hoyLab)),
    semana_ini: sqlInstante(inicioDiaLocal(lunes)),
    mes_ini: sqlInstante(inicioDiaLocal(primeroMes)),
    fin: sqlInstante(finDiaLocal(hoyLab)),
  };
  const statsSql = `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN tabla_origen = 'reactivos' THEN 1 ELSE 0 END) AS reactivos,
        SUM(CASE WHEN tabla_origen = 'consumibles' THEN 1 ELSE 0 END) AS consumibles,
        SUM(CASE WHEN creado_en >= :hoy_ini AND creado_en <= :fin THEN 1 ELSE 0 END) AS hoy,
        SUM(CASE WHEN creado_en >= :semana_ini AND creado_en <= :fin THEN 1 ELSE 0 END) AS semana,
        SUM(CASE WHEN creado_en >= :mes_ini AND creado_en <= :fin THEN 1 ELSE 0 END) AS mes
      FROM movimientos
    `;
  const stats = (await s.queryOne<Row>(statsSql, limites)) || {};
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
  await requirePermission(s, user, "equipos", "V");

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
  await requirePermission(s, user, "equipos", "V");

  const row = await s.queryOne(`${MANTENIMIENTO_SELECT} WHERE mt.id = :id LIMIT 1`, { id: mantenimientoId });
  if (!row) {
    return json({ message: "Mantenimiento no encontrado" }, 404);
  }
  return json({ item: row });
}

/*
 * El estado del equipo sigue a sus mantenimientos: con cualquiera pendiente
 * (programado, en proceso o vencido) el equipo está "en mantenimiento"; cuando
 * no queda ninguno vuelve a "operativo". "Fuera de servicio" es manual y no se
 * toca; "calibración pendiente" solo se conserva si lo puso una persona y no
 * hay mantenimiento pendiente que lo sustituya. Al completar una calibración se
 * puede fijar la próxima fecha.
 */
export async function syncEquipoEstado(s: Session, equipoId: number, proximaCalibracion?: string | null, calibracionCompletada = false): Promise<void> {
  const equipo = await s.queryOne<{ estado: string }>("SELECT estado FROM equipos WHERE id = :id", { id: equipoId });
  if (!equipo) return;
  const pendientes = await s.scalar("SELECT COUNT(*) FROM mantenimientos WHERE id_equipo = :id AND estado IN ('programado', 'en_proceso', 'vencido')", { id: equipoId });
  const updates: string[] = [];
  const params: Record<string, unknown> = { id: equipoId };
  if (proximaCalibracion) {
    updates.push("fecha_prox_calibracion = :proxima");
    params.proxima = proximaCalibracion;
  }
  if (equipo.estado !== "fuera_servicio") {
    // Una calibración completada también levanta la "calibración pendiente" puesta a mano.
    const libera = equipo.estado === "mantenimiento" || (calibracionCompletada && equipo.estado === "calibracion_pendiente");
    const nuevo = Number(pendientes || 0) > 0 ? "mantenimiento" : libera ? "operativo" : equipo.estado;
    if (nuevo !== equipo.estado) {
      updates.push("estado = :estado");
      params.estado = nuevo;
    }
  }
  if (updates.length) await s.execute(`UPDATE equipos SET ${updates.join(", ")} WHERE id = :id`, params);
}

export async function createMantenimiento({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const supervision = marcaSupervision(await requirePermission(s, user, "equipos", "C", { objeto: "mantenimiento" }));

  const payload = await readJson(request);
  const data = normalizeMantenimientoPayload(payload);
  const proximaCalibracion = data.estado === "completado" && data.tipo === "calibracion" ? toStrOrNull(payload.proxima_calibracion, 10) : null;
  if (!data.id_equipo) {
    return json({ message: "Selecciona un equipo" }, 400);
  }
  if (!data.fecha_programada) {
    return json({ message: "La fecha programada es obligatoria" }, 400);
  }
  if (data.estado === "completado" && !data.fecha_realizado) {
    return json({ message: "Indica la fecha en que se realizó para marcarlo como completado" }, 400);
  }
  // Lo capturado bajo supervision no se da por completado sin el visto bueno.
  if (supervision && data.estado === "completado") return json({ message: "Lo que capturas bajo supervisión no se marca como completado: queda pendiente del visto bueno de tu supervisor", codigo: "supervision_pendiente" }, 409);

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
  await aplicarSupervision(s, "mantenimientos", result.lastrowid as number, supervision, userIdFromClaims(user));
  await registrarAuditoria(s, user, { accion: "crear", entidad: "mantenimientos", entidadId: result.lastrowid, referencia: `mantenimiento ${data.tipo} equipo ${data.id_equipo}`, despues: await snapshotRow(s, "mantenimientos", result.lastrowid) });
  await syncEquipoEstado(s, Number(data.id_equipo), proximaCalibracion, data.estado === "completado" && data.tipo === "calibracion");
  await s.commit();
  return json({ message: "Mantenimiento programado", id: result.lastrowid }, 201);
}

export async function updateMantenimiento({ request, s, params }: RouteContext): Promise<Response> {
  const mantenimientoId = intParam(params.id);
  const user = await requireUser(request);
  const supervision = marcaSupervision(await requirePermission(s, user, "equipos", "E", { objeto: "mantenimiento" }));

  const payload = await readJson(request);
  const data = normalizeMantenimientoPayload(payload);
  const proximaCalibracion = data.estado === "completado" && data.tipo === "calibracion" ? toStrOrNull(payload.proxima_calibracion, 10) : null;
  if (!data.id_equipo) {
    return json({ message: "Selecciona un equipo" }, 400);
  }
  if (!data.fecha_programada) {
    return json({ message: "La fecha programada es obligatoria" }, 400);
  }
  if (data.estado === "completado" && !data.fecha_realizado) {
    return json({ message: "Indica la fecha en que se realizó para marcarlo como completado" }, 400);
  }

  const antesMantenimiento = await snapshotRow(s, "mantenimientos", mantenimientoId);
  if (data.estado === "completado" && String(antesMantenimiento?.estado || "") !== "completado") {
    if (supervision) return json({ message: "Lo que capturas bajo supervisión no se marca como completado: queda pendiente del visto bueno de tu supervisor", codigo: "supervision_pendiente" }, 409);
    exigirSinSupervisionPendiente(antesMantenimiento, "El mantenimiento", "marcar como completado");
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
  if (result.rowcount === 0) {
    await s.rollback();
    return json({ message: "Mantenimiento no encontrado" }, 404);
  }
  await aplicarSupervision(s, "mantenimientos", mantenimientoId, supervision, userIdFromClaims(user));
  await registrarAuditoria(s, user, { accion: "editar", entidad: "mantenimientos", entidadId: mantenimientoId, referencia: `mantenimiento ${data.tipo} equipo ${data.id_equipo}`, antes: antesMantenimiento, despues: await snapshotRow(s, "mantenimientos", mantenimientoId) });
  // Si el mantenimiento se movió de equipo, el anterior también se recalcula.
  const equipoAnterior = Number(antesMantenimiento?.id_equipo || 0);
  if (equipoAnterior && equipoAnterior !== Number(data.id_equipo)) await syncEquipoEstado(s, equipoAnterior);
  await syncEquipoEstado(s, Number(data.id_equipo), proximaCalibracion, data.estado === "completado" && data.tipo === "calibracion");
  await s.commit();
  return json({ message: "Mantenimiento actualizado" });
}

export async function deleteMantenimiento({ request, s, params }: RouteContext): Promise<Response> {
  const mantenimientoId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "equipos", "AN");

  let rowcount: number;
  try {
    // Los mantenimientos son registros del historial del equipo: se cancelan con motivo, no se borran.
    const payload = await readJson(request);
    const motivo = String(payload.motivo || "").trim();
    if (motivo.length < 5) return json({ message: "Indica el motivo de la cancelacion (al menos 5 caracteres)" }, 400);
    await exigirReauth(s, request, user, "equipos:AN");
    const antes = await snapshotRow(s, "mantenimientos", mantenimientoId);
    // `||` es concatenacion en SQLite pero OR logico en MySQL: se usa CONCAT en ese motor.
    const observaciones = isSqlite() ? "TRIM(COALESCE(observaciones, '') || :nota)" : "TRIM(CONCAT(COALESCE(observaciones, ''), :nota))";
    const result = await s.execute(`UPDATE mantenimientos SET estado = 'cancelado', observaciones = ${observaciones} WHERE id = :id AND estado <> 'cancelado'`, { id: mantenimientoId, nota: `\n[Cancelado: ${motivo}]` });
    if (result.rowcount > 0) {
      await registrarAuditoria(s, user, { accion: "anular", entidad: "mantenimientos", entidadId: mantenimientoId, referencia: `mantenimiento ${antes?.tipo || ""} equipo ${antes?.id_equipo || ""}`, motivo, antes, despues: await snapshotRow(s, "mantenimientos", mantenimientoId) });
      if (antes?.id_equipo) await syncEquipoEstado(s, Number(antes.id_equipo));
    }
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
  return json({ message: "Mantenimiento cancelado" });
}

/*
 * Guarda el último folio de bitácora anotado para cada equipo (extracción,
 * análisis) para que el siguiente formato lo sugiera. Solo avanza: nunca
 * pisa un folio mayor ya registrado si ambos son numéricos.
 */
export async function recordBitacoraFolios(s: Session, entries: Array<{ equipoId: unknown; folio: unknown }>): Promise<void> {
  const seen = new Set<number>();
  for (const entry of entries) {
    const id = toIntOrNull(entry.equipoId);
    const folio = toStrOrNull(entry.folio, 60);
    if (!id || !folio || seen.has(id)) continue;
    seen.add(id);
    const row = await s.queryOne<{ ultimo_folio_bitacora: string | null }>("SELECT ultimo_folio_bitacora FROM equipos WHERE id = :id", { id });
    if (!row) continue;
    const previo = row.ultimo_folio_bitacora ? String(row.ultimo_folio_bitacora) : "";
    if (/^\d+$/.test(previo) && /^\d+$/.test(folio) && Number(folio) < Number(previo)) continue;
    await s.execute("UPDATE equipos SET ultimo_folio_bitacora = :folio WHERE id = :id", { id, folio });
  }
}
