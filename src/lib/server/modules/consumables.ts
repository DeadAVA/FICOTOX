import { requireUser, userIdFromClaims } from "../auth";
import { registrarAuditoria, snapshotRow } from "../audit";

import { HttpError, intParam, json, readJson, type RouteContext } from "../http";
import { darDeBaja, reactivarItem } from "../inventory-baja";

import { requirePermission } from "../rbac";
import { aplicarSupervision, marcaSupervision } from "../supervision";

import { interpretarMovimiento } from "../inventory-movimientos";
import { searchParam, toFloatOrNull, toStrOrNull, utcTimestampReference } from "./helpers";

/* Portado de modules/inventory/consumables.py del backend Flask original. */

interface ConsumablePayload {
  id_interno: string | null;
  producto: string;
  marca: string | null;
  proveedor: string | null;
  catalogo_parte_cas: string | null;
  lote: string | null;
  fecha_ingreso: string | null;
  tamano_capacidad: string | null;
  contenedor: string | null;
  piezas: number | null;
  cantidad_por_pieza: number | null;
  localizacion: string | null;
  stock_minimo: number | null;
  observaciones: string | null;
}

class ConsumibleInvalido extends Error {}

function numeroNoNegativo(value: unknown, etiqueta: string): number | null {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const n = toFloatOrNull(value);
  if (n === null || n < 0) throw new ConsumibleInvalido(`«${etiqueta}» debe ser un número mayor o igual a cero`);
  return n;
}

/* Fecha de ingreso opcional: vacío o "s/f" (sin fecha) se guarda vacío. */
function fechaOpcional(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return !text || /^s\/?f$/i.test(text) ? null : text.slice(0, 20);
}

function normalizePayload(raw: Record<string, unknown> | null | undefined): ConsumablePayload {
  const data = raw || {};
  const contenedor = toStrOrNull(data.contenedor, 120);
  return {
    id_interno: toStrOrNull(data.id_interno, 120),
    producto: String(data.producto || "").trim(),
    marca: toStrOrNull(data.marca, 120),
    proveedor: toStrOrNull(data.proveedor, 180),
    catalogo_parte_cas: toStrOrNull(data.catalogo_parte_cas, 180),
    lote: toStrOrNull(data.lote, 120),
    fecha_ingreso: fechaOpcional(data.fecha_ingreso),
    tamano_capacidad: toStrOrNull(data.tamano_capacidad, 120),
    contenedor,
    piezas: numeroNoNegativo(data.piezas, "Piezas"),
    cantidad_por_pieza: numeroNoNegativo(data.cantidad_por_pieza, "Cantidad por pieza"),
    localizacion: toStrOrNull(data.localizacion, 180),
    stock_minimo: numeroNoNegativo(data.stock_minimo, "Stock mínimo"),
    observaciones: toStrOrNull(data.observaciones, 4000),
  };
}

/* Importacion: una fila con un numero invalido se omite en vez de detener la carga. */
function normalizarOmitiendo(raw: Record<string, unknown>): ConsumablePayload | null {
  try {
    return normalizePayload(raw);
  } catch (err) {
    if (err instanceof ConsumibleInvalido) return null;
    throw err;
  }
}

function normalizeKey(key: unknown): string {
  if (key === null || key === undefined) return "";
  let normalized = String(key).trim().toLowerCase().replace(/﻿/g, "");
  normalized = normalized
    .replace(/á/g, "a")
    .replace(/é/g, "e")
    .replace(/í/g, "i")
    .replace(/ó/g, "o")
    .replace(/ú/g, "u")
    .replace(/ñ/g, "n");
  for (const ch of [" ", "#", "/", ".", "-"]) {
    normalized = normalized.split(ch).join("_");
  }
  while (normalized.includes("__")) {
    normalized = normalized.replace("__", "_");
  }
  return normalized.replace(/^_+|_+$/g, "");
}

function canonicalizeRowKeys(row: Record<string, unknown>): Record<string, unknown> {
  const aliases: Record<string, string> = {
    producto: "producto",
    marca: "marca",
    proveedor: "proveedor",
    catalogo_parte_cas: "catalogo_parte_cas",
    catalogo_parte_c_a_s: "catalogo_parte_cas",
    catalogo_parte: "catalogo_parte_cas",
    fecha_de_ingreso: "fecha_ingreso",
    fecha_ingreso: "fecha_ingreso",
    tamano_capacidad: "tamano_capacidad",
    tama_o_capacidad: "tamano_capacidad",
    contenedor: "contenedor",
    piezas: "piezas",
    cantidad_por_pieza: "cantidad_por_pieza",
    cantidad_por_pieza_: "cantidad_por_pieza",
  };

  const canon: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row || {})) {
    const norm = normalizeKey(key);
    let target = aliases[norm];
    if (!target) {
      if (norm.includes("catalogo") && norm.includes("parte") && norm.includes("cas")) {
        target = "catalogo_parte_cas";
      } else if (norm.includes("tam") && norm.includes("capacidad")) {
        target = "tamano_capacidad";
      } else if (["producto", "marca", "proveedor", "fecha_ingreso", "contenedor", "piezas"].includes(norm)) {
        target = norm;
      }
    }
    if (target) canon[target] = value;
  }
  return canon;
}

/*
 * Intenta primero UTF-8 (con/sin BOM) y luego latin-1/cp1252.
 * Muchos CSV de Excel en Windows llegan en ANSI (cp1252/latin-1).
 */
function decodeCsvBytes(bytes: Uint8Array): string {
  for (const encoding of ["utf-8", "windows-1252", "iso-8859-1"]) {
    try {
      return new TextDecoder(encoding, { fatal: true, ignoreBOM: false }).decode(bytes);
    } catch {
      continue;
    }
  }
  return new TextDecoder("utf-8").decode(bytes);
}

/* Lector CSV equivalente a csv.DictReader (comillas dobles, delimitador configurable). */
function parseCsvRecords(text: string, delimiter: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (ch !== "\r") {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  if (!rows.length) return [];
  const headers = rows[0];
  return rows.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = cells[index] ?? "";
    });
    return record;
  });
}

const SELECT_COLUMNS = `
  SELECT id, id_interno, producto, marca, proveedor, catalogo_parte_cas, lote,
         fecha_ingreso, tamano_capacidad, contenedor, piezas,
         cantidad_por_pieza, localizacion, stock_minimo, observaciones, stock_maximo, activo, baja_motivo, baja_en, creado_por, creado_en
  FROM consumibles
`;

export async function getConsumables({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "inventario", "V");

  const search = new URL(request.url).searchParams.get("search") ?? "";
  const rows = await s.query(
    `${SELECT_COLUMNS}
    WHERE (:incluir_bajas = 1 OR COALESCE(activo, 1) = 1)
      AND (producto LIKE :search OR marca LIKE :search OR id_interno LIKE :search OR lote LIKE :search OR catalogo_parte_cas LIKE :search OR localizacion LIKE :search)
    ORDER BY producto ASC
    `,
    { search: `%${search}%`, incluir_bajas: searchParam(request, "bajas") === "1" ? 1 : 0 },
  );
  return json({ items: rows, total: rows.length });
}

export async function createConsumable({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const supervision = marcaSupervision(await requirePermission(s, user, "inventario", "C", { objeto: "catalogo_inventario" }));

  let data: ConsumablePayload;
  try {
    data = normalizePayload(await readJson(request));
  } catch (err) {
    if (err instanceof ConsumibleInvalido) return json({ message: err.message }, 400);
    throw err;
  }
  if (!data.producto) {
    return json({ message: "El campo 'producto' es obligatorio" }, 400);
  }

  const result = await s.execute(
    `
    INSERT INTO consumibles (id_interno, producto, marca, proveedor, catalogo_parte_cas, lote, fecha_ingreso, tamano_capacidad, contenedor, piezas, cantidad_por_pieza, localizacion, stock_minimo, observaciones, stock_maximo, creado_por)
    VALUES (:id_interno, :producto, :marca, :proveedor, :catalogo_parte_cas, :lote, :fecha_ingreso, :tamano_capacidad, :contenedor, COALESCE(:piezas, 0), :cantidad_por_pieza, :localizacion, :stock_minimo, :observaciones, :piezas, :creado_por)
    `,
    { ...data, creado_por: userIdFromClaims(user) },
  );
  const id = result.lastrowid as number;
  if (data.piezas && data.piezas > 0) {
    await s.execute(
      `INSERT INTO movimientos (tipo, tabla_origen, id_item, cantidad, motivo, referencia, id_usuario, unidad)
       VALUES ('entrada', 'consumibles', :id, :cantidad, 'Existencia inicial', :referencia, :id_usuario, 'piezas')`,
      { id, cantidad: data.piezas, referencia: `consumible-inicial-${id}`, id_usuario: userIdFromClaims(user) },
    );
  }
  await aplicarSupervision(s, "consumibles", id, supervision, userIdFromClaims(user));
  await registrarAuditoria(s, user, { accion: "crear", entidad: "consumibles", entidadId: id, referencia: String(data.producto), despues: await snapshotRow(s, "consumibles", id) });
  await s.commit();
  return json({ message: "Consumible creado", id }, 201);
}

export async function getConsumable({ request, s, params }: RouteContext): Promise<Response> {
  const consumableId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "inventario", "V");

  const row = await s.queryOne(`${SELECT_COLUMNS} WHERE id = :id LIMIT 1`, { id: consumableId });
  if (!row) {
    return json({ message: "Consumible no encontrado" }, 404);
  }
  return json({ item: row });
}

export async function updateConsumable({ request, s, params }: RouteContext): Promise<Response> {
  const consumableId = intParam(params.id);
  const user = await requireUser(request);
  const supervision = marcaSupervision(await requirePermission(s, user, "inventario", "E", { objeto: "catalogo_inventario" }));

  let data: ConsumablePayload;
  try {
    data = normalizePayload(await readJson(request));
  } catch (err) {
    if (err instanceof ConsumibleInvalido) return json({ message: err.message }, 400);
    throw err;
  }
  if (!data.producto) {
    return json({ message: "El campo 'producto' es obligatorio" }, 400);
  }

  // Las piezas en existencia solo cambian con movimientos (entrada, salida, consumo o ajuste).
  const antes = await snapshotRow(s, "consumibles", consumableId);
  const result = await s.execute(
    `
    UPDATE consumibles
    SET id_interno = :id_interno, producto = :producto, marca = :marca, proveedor = :proveedor, catalogo_parte_cas = :catalogo_parte_cas,
        lote = :lote, fecha_ingreso = :fecha_ingreso, tamano_capacidad = :tamano_capacidad, contenedor = :contenedor,
        cantidad_por_pieza = :cantidad_por_pieza, localizacion = :localizacion, stock_minimo = :stock_minimo, observaciones = :observaciones
    WHERE id = :id
    `,
    { id_interno: data.id_interno, producto: data.producto, marca: data.marca, proveedor: data.proveedor, catalogo_parte_cas: data.catalogo_parte_cas, lote: data.lote, fecha_ingreso: data.fecha_ingreso, tamano_capacidad: data.tamano_capacidad, contenedor: data.contenedor, cantidad_por_pieza: data.cantidad_por_pieza, localizacion: data.localizacion, stock_minimo: data.stock_minimo, observaciones: data.observaciones, id: consumableId },
  );
  if (result.rowcount === 0) {
    await s.rollback();
    return json({ message: "Consumible no encontrado" }, 404);
  }
  await aplicarSupervision(s, "consumibles", consumableId, supervision, userIdFromClaims(user));
  await registrarAuditoria(s, user, { accion: "editar", entidad: "consumibles", entidadId: consumableId, referencia: String(data.producto), antes, despues: await snapshotRow(s, "consumibles", consumableId) });
  await s.commit();
  return json({ message: "Consumible actualizado" });
}

export async function refillConsumable({ request, s, params }: RouteContext): Promise<Response> {
  const consumableId = intParam(params.id);
  const user = await requireUser(request);
  const supervision = marcaSupervision(await requirePermission(s, user, "inventario", "C", { objeto: "movimiento" }));

  const data = await readJson(request);
  // Corregir la existencia por conteo es una edición: pide además el permiso de editar movimientos.
  if (String(data.tipo || "").toLowerCase() === "ajuste") await requirePermission(s, user, "inventario", "E", { objeto: "movimiento" });
  const row = await s.queryOne<Record<string, unknown>>("SELECT piezas, stock_maximo FROM consumibles WHERE id = :id LIMIT 1", { id: consumableId });
  if (!row) {
    return json({ message: "Consumible no encontrado" }, 404);
  }
  const existencia = toFloatOrNull(row.piezas) || 0;
  const mov = await interpretarMovimiento(s, data, existencia);
  const userId = userIdFromClaims(user);

  await s.execute(
    `
    UPDATE consumibles
    SET stock_maximo = CASE
            WHEN stock_maximo IS NULL OR stock_maximo < COALESCE(piezas, 0) + :delta
            THEN COALESCE(piezas, 0) + :delta
            ELSE stock_maximo
        END,
        piezas = COALESCE(piezas, 0) + :delta
    WHERE id = :id
    `,
    { id: consumableId, delta: mov.delta },
  );

  await s.execute(
    `
    INSERT INTO movimientos (tipo, tabla_origen, id_item, cantidad, motivo, referencia, id_usuario, unidad, vinculo_tipo, vinculo_id)
    VALUES (:tipo, 'consumibles', :id, :cantidad, :motivo, :referencia, :id_usuario, 'piezas', :vinculo_tipo, :vinculo_id)
    `,
    {
      tipo: mov.tipo,
      id: consumableId,
      cantidad: mov.cantidad,
      motivo: mov.motivo,
      referencia: `consumible-${mov.tipo}-${consumableId}-${utcTimestampReference()}`,
      id_usuario: userId,
      vinculo_tipo: mov.vinculoTipo,
      vinculo_id: mov.vinculoId,
    },
  );
  await aplicarSupervision(s, "consumibles", consumableId, supervision, userId);
  const despues = await snapshotRow(s, "consumibles", consumableId);
  await registrarAuditoria(s, user, { accion: "reponer", entidad: "consumibles", entidadId: consumableId, referencia: String(despues?.producto || consumableId), motivo: mov.motivo, despues, detalle: { tipo: mov.tipo, cantidad: mov.cantidad, existencia_anterior: existencia, existencia_nueva: existencia + mov.delta } });
  await s.commit();
  return json({ message: mov.tipo === "ajuste" ? "Existencia ajustada" : "Movimiento registrado" });
}

/* Baja logica: conserva movimientos y registros que citan al consumible. */
export async function deleteConsumable({ request, s, params }: RouteContext): Promise<Response> {
  const consumableId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "inventario", "AN");
  return darDeBaja(s, user, "consumibles", consumableId, await readJson(request), "Consumible", request);
}

export async function reactivarConsumable({ request, s, params }: RouteContext): Promise<Response> {
  const consumableId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "inventario", "G");
  return reactivarItem(s, user, "consumibles", consumableId, await readJson(request), "Consumible", request);
}

const IMPORT_INSERT = `
  INSERT INTO consumibles (id_interno, producto, marca, proveedor, catalogo_parte_cas, lote, fecha_ingreso, tamano_capacidad, contenedor, piezas, cantidad_por_pieza, localizacion, stock_minimo, observaciones, stock_maximo)
  VALUES (:id_interno, :producto, :marca, :proveedor, :catalogo_parte_cas, :lote, :fecha_ingreso, :tamano_capacidad, :contenedor, COALESCE(:piezas, 0), :cantidad_por_pieza, :localizacion, :stock_minimo, :observaciones, :piezas)
`;

export async function importConsumables({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  // La importacion masiva no se hace bajo supervision (no hay visto bueno por fila).
  if (marcaSupervision(await requirePermission(s, user, "inventario", "C", { objeto: "catalogo_inventario" }))) throw new HttpError(403, { message: "La importación masiva no está disponible para capturas bajo supervisión" });
  let inserted = 0;

  const contentType = request.headers.get("content-type") || "";
  const jsonPayload = contentType.includes("application/json") ? await readJson(request) : null;

  // Permite importar filas preprocesadas desde frontend (preview + depuracion).
  if (jsonPayload && Array.isArray(jsonPayload.rows)) {
    for (const row of jsonPayload.rows) {
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      const data = normalizarOmitiendo(row as Record<string, unknown>);
      if (!data || !data.producto) continue;
      await s.execute(IMPORT_INSERT, { ...data });
      inserted += 1;
    }
  } else {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      form = new FormData();
    }
    const file = form.get("file");
    if (!(file instanceof File)) {
      return json({ message: "No se proporciono archivo" }, 400);
    }
    if (!file.name || !file.name.toLowerCase().endsWith(".csv")) {
      return json({ message: "Formato invalido. Solo CSV" }, 400);
    }

    const decoded = decodeCsvBytes(new Uint8Array(await file.arrayBuffer()));
    const sample = decoded ? decoded.split(/\r\n|\r|\n/)[0] : "";
    const delimiter = (sample.match(/;/g) || []).length > (sample.match(/,/g) || []).length ? ";" : ",";

    for (const record of parseCsvRecords(decoded, delimiter)) {
      const data = normalizarOmitiendo(canonicalizeRowKeys(record));
      if (!data || !data.producto) continue;
      await s.execute(IMPORT_INSERT, { ...data });
      inserted += 1;
    }
  }

  await registrarAuditoria(s, user, { accion: "importar", entidad: "consumibles", referencia: "importacion Excel/CSV", detalle: { insertados: inserted } });
  await s.commit();
  return json({ message: "Importacion completada", insertados: inserted });
}
