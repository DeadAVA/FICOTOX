import { requireUser, userIdFromClaims } from "../auth";
import { registrarAuditoria, snapshotRow } from "../audit";
import { type Session } from "../db";
import { intParam, json, readJson, type RouteContext } from "../http";
import { darDeBaja, ensureBajaColumns, reactivarItem } from "../inventory-baja";
import { ensureMovimientosSchema } from "../inventory-usage";
import { requirePermission } from "../rbac";
import { addColumnIfMissing, markSchemaReady, schemaReady } from "../schema";
import { searchParam, toIntOrNull, utcTimestampReference } from "./helpers";

/* Portado de modules/inventory/consumables.py del backend Flask original. */

export async function ensureConsumiblesSchema(s: Session): Promise<void> {
  if (schemaReady("consumibles")) return;
  await s.execute(
    `
    CREATE TABLE IF NOT EXISTS consumibles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        producto VARCHAR(180) NOT NULL,
        marca VARCHAR(120) DEFAULT NULL,
        proveedor VARCHAR(180) DEFAULT NULL,
        catalogo_parte_cas VARCHAR(180) DEFAULT NULL,
        fecha_ingreso DATE DEFAULT NULL,
        tamano_capacidad VARCHAR(120) DEFAULT NULL,
        contenedor VARCHAR(120) DEFAULT NULL,
        piezas INTEGER DEFAULT 0,
        cantidad_por_pieza INTEGER DEFAULT NULL,
        stock_maximo INTEGER DEFAULT NULL,
        creado_por INTEGER DEFAULT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `,
  );
  await addColumnIfMissing(s, "consumibles", "stock_maximo", "INTEGER DEFAULT NULL");
  await ensureBajaColumns(s, "consumibles");
  await s.execute(
    `
    UPDATE consumibles
    SET stock_maximo = piezas
    WHERE stock_maximo IS NULL AND piezas IS NOT NULL AND piezas > 0
    `,
  );
  markSchemaReady("consumibles");
}

interface ConsumablePayload {
  producto: string;
  marca: unknown;
  proveedor: unknown;
  catalogo_parte_cas: unknown;
  fecha_ingreso: unknown;
  tamano_capacidad: unknown;
  contenedor: unknown;
  piezas: number | null;
  cantidad_por_pieza: number | null;
  stock_maximo: number | null;
}

function orNull(value: unknown): unknown {
  return value ? value : null;
}

function normalizePayload(raw: Record<string, unknown> | null | undefined): ConsumablePayload {
  const data = raw || {};
  return {
    producto: String(data.producto || "").trim(),
    marca: orNull(data.marca),
    proveedor: orNull(data.proveedor),
    catalogo_parte_cas: orNull(data.catalogo_parte_cas),
    fecha_ingreso: orNull(data.fecha_ingreso),
    tamano_capacidad: orNull(data.tamano_capacidad),
    contenedor: orNull(data.contenedor),
    piezas: toIntOrNull(data.piezas),
    cantidad_por_pieza: toIntOrNull(data.cantidad_por_pieza),
    /* Stock de referencia para el medidor; si no se captura, las piezas iniciales. */
    stock_maximo: toIntOrNull(data.stock_maximo),
  };
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
  SELECT id, producto, marca, proveedor, catalogo_parte_cas,
         fecha_ingreso, tamano_capacidad, contenedor, piezas,
         cantidad_por_pieza, stock_maximo, activo, baja_motivo, baja_en, creado_por, creado_en
  FROM consumibles
`;

export async function getConsumables({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "consumibles", "read");
  await ensureConsumiblesSchema(s);

  const search = new URL(request.url).searchParams.get("search") ?? "";
  const rows = await s.query(
    `${SELECT_COLUMNS}
    WHERE (:incluir_bajas = 1 OR COALESCE(activo, 1) = 1)
      AND (producto LIKE :search OR marca LIKE :search)
    ORDER BY producto ASC
    `,
    { search: `%${search}%`, incluir_bajas: searchParam(request, "bajas") === "1" ? 1 : 0 },
  );
  return json({ items: rows, total: rows.length });
}

export async function createConsumable({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "consumibles", "create");
  await ensureConsumiblesSchema(s);

  const data = normalizePayload(await readJson(request));
  if (!data.producto) {
    return json({ message: "El campo 'producto' es obligatorio" }, 400);
  }

  const result = await s.execute(
    `
    INSERT INTO consumibles (producto, marca, proveedor, catalogo_parte_cas, fecha_ingreso, tamano_capacidad, contenedor, piezas, cantidad_por_pieza, stock_maximo, creado_por)
    VALUES (:producto, :marca, :proveedor, :catalogo_parte_cas, :fecha_ingreso, :tamano_capacidad, :contenedor, :piezas, :cantidad_por_pieza, COALESCE(:stock_maximo, :piezas), :creado_por)
    `,
    { ...data, creado_por: userIdFromClaims(user) },
  );
  await registrarAuditoria(s, user, { accion: "crear", entidad: "consumibles", entidadId: result.lastrowid, referencia: String(data.producto), despues: await snapshotRow(s, "consumibles", result.lastrowid) });
  await s.commit();
  return json({ message: "Consumible creado", id: result.lastrowid }, 201);
}

export async function getConsumable({ request, s, params }: RouteContext): Promise<Response> {
  const consumableId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "consumibles", "read");
  await ensureConsumiblesSchema(s);

  const row = await s.queryOne(`${SELECT_COLUMNS} WHERE id = :id LIMIT 1`, { id: consumableId });
  if (!row) {
    return json({ message: "Consumible no encontrado" }, 404);
  }
  return json({ item: row });
}

export async function updateConsumable({ request, s, params }: RouteContext): Promise<Response> {
  const consumableId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "consumibles", "update");
  await ensureConsumiblesSchema(s);

  const data = normalizePayload(await readJson(request));
  if (!data.producto) {
    return json({ message: "El campo 'producto' es obligatorio" }, 400);
  }

  const antes = await snapshotRow(s, "consumibles", consumableId);
  const result = await s.execute(
    `
    UPDATE consumibles
    SET producto = :producto, marca = :marca, proveedor = :proveedor, catalogo_parte_cas = :catalogo_parte_cas,
        fecha_ingreso = :fecha_ingreso, tamano_capacidad = :tamano_capacidad, contenedor = :contenedor,
        piezas = :piezas, cantidad_por_pieza = :cantidad_por_pieza,
        stock_maximo = COALESCE(:stock_maximo, stock_maximo, :piezas)
    WHERE id = :id
    `,
    { ...data, id: consumableId },
  );
  if (result.rowcount === 0) {
    await s.rollback();
    return json({ message: "Consumible no encontrado" }, 404);
  }
  await registrarAuditoria(s, user, { accion: "editar", entidad: "consumibles", entidadId: consumableId, referencia: String(data.producto), antes, despues: await snapshotRow(s, "consumibles", consumableId) });
  await s.commit();
  return json({ message: "Consumible actualizado" });
}

export async function refillConsumable({ request, s, params }: RouteContext): Promise<Response> {
  const consumableId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "consumibles", "update");
  await ensureConsumiblesSchema(s);
  await ensureMovimientosSchema(s);

  const data = await readJson(request);
  const amount = toIntOrNull(data.cantidad);
  if (amount === null || amount <= 0) {
    return json({ message: "Captura una cantidad mayor a cero" }, 400);
  }

  const userId = userIdFromClaims(user);
  const motivo = String(data.motivo || "Relleno manual de stock").trim();

  const result = await s.execute(
    `
    UPDATE consumibles
    SET stock_maximo = CASE
            WHEN stock_maximo IS NULL OR stock_maximo < COALESCE(piezas, 0) + :cantidad
            THEN COALESCE(piezas, 0) + :cantidad
            ELSE stock_maximo
        END,
        piezas = COALESCE(piezas, 0) + :cantidad
    WHERE id = :id
    `,
    { id: consumableId, cantidad: amount },
  );
  if (result.rowcount === 0) {
    await s.rollback();
    return json({ message: "Consumible no encontrado" }, 404);
  }

  await s.execute(
    `
    INSERT INTO movimientos (tipo, tabla_origen, id_item, cantidad, motivo, referencia, id_usuario)
    VALUES ('entrada', 'consumibles', :id, :cantidad, :motivo, :referencia, :id_usuario)
    `,
    {
      id: consumableId,
      cantidad: amount,
      motivo,
      referencia: `consumible-refill-${consumableId}-${utcTimestampReference()}`,
      id_usuario: userId,
    },
  );
  const despues = await snapshotRow(s, "consumibles", consumableId);
  await registrarAuditoria(s, user, { accion: "reponer", entidad: "consumibles", entidadId: consumableId, referencia: String(despues?.producto || consumableId), motivo, despues, detalle: { cantidad: amount } });
  await s.commit();
  return json({ message: "Stock de consumible rellenado" });
}

/* Baja logica: conserva movimientos y registros que citan al consumible. */
export async function deleteConsumable({ request, s, params }: RouteContext): Promise<Response> {
  const consumableId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "consumibles", "delete");
  await ensureConsumiblesSchema(s);
  return darDeBaja(s, user, "consumibles", consumableId, await readJson(request), "Consumible");
}

export async function reactivarConsumable({ request, s, params }: RouteContext): Promise<Response> {
  const consumableId = intParam(params.id);
  const user = await requireUser(request);
  await requirePermission(s, user, "consumibles", "delete");
  await ensureConsumiblesSchema(s);
  return reactivarItem(s, user, "consumibles", consumableId, await readJson(request), "Consumible");
}

const IMPORT_INSERT = `
  INSERT INTO consumibles (producto, marca, proveedor, catalogo_parte_cas, fecha_ingreso, tamano_capacidad, contenedor, piezas, cantidad_por_pieza, stock_maximo)
  VALUES (:producto, :marca, :proveedor, :catalogo_parte_cas, :fecha_ingreso, :tamano_capacidad, :contenedor, :piezas, :cantidad_por_pieza, :piezas)
`;

export async function importConsumables({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "consumibles", "create");
  await ensureConsumiblesSchema(s);
  let inserted = 0;

  const contentType = request.headers.get("content-type") || "";
  const jsonPayload = contentType.includes("application/json") ? await readJson(request) : null;

  // Permite importar filas preprocesadas desde frontend (preview + depuracion).
  if (jsonPayload && Array.isArray(jsonPayload.rows)) {
    for (const row of jsonPayload.rows) {
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      const data = normalizePayload(row as Record<string, unknown>);
      if (!data.producto) continue;
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
      const data = normalizePayload(canonicalizeRowKeys(record));
      if (!data.producto) continue;
      await s.execute(IMPORT_INSERT, { ...data });
      inserted += 1;
    }
  }

  await registrarAuditoria(s, user, { accion: "importar", entidad: "consumibles", referencia: "importacion Excel/CSV", detalle: { insertados: inserted } });
  await s.commit();
  return json({ message: "Importacion completada", insertados: inserted });
}
