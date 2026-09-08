import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { requireUser } from "../auth";
import { getConfig } from "../config";
import { isSqlite, type Session } from "../db";
import { json, type RouteContext } from "../http";
import { requirePermission } from "../rbac";

/* Portado de modules/documents/endpoints.py del backend Flask original. */

function reportsUploadDir(): string {
  const folder = path.join(getConfig().INSTANCE_DIR, "maintenance_reports");
  fs.mkdirSync(folder, { recursive: true });
  return folder;
}

export async function ensureReportesMantenimientoSchema(s: Session): Promise<void> {
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

async function nextReportCode(s: Session, mantenimientoId: number): Promise<string> {
  const count = Number((await s.scalar("SELECT COUNT(*) FROM reportes_mantenimiento WHERE id_mantenimiento = :id", { id: mantenimientoId })) || 0);
  return `RM-${String(mantenimientoId).padStart(5, "0")}-${String(count + 1).padStart(2, "0")}`;
}

/* Equivalente de werkzeug.utils.secure_filename. */
export function secureFilename(filename: string): string {
  let value = filename.normalize("NFKD").replace(/[^\x00-\x7F]/g, "");
  value = value.replace(/[/\\]/g, " ");
  value = value
    .split(/\s+/)
    .join("_")
    .replace(/[^A-Za-z0-9_.-]/g, "")
    .replace(/^[._]+/, "");
  const reserved = new Set(["CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "LPT1", "LPT2", "LPT3"]);
  const base = value.split(".")[0].toUpperCase();
  if (reserved.has(base)) value = `_${value}`;
  return value;
}

export async function documentsSummary({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "dashboard", "read");
  await ensureReportesMantenimientoSchema(s);

  const summary = await s.queryOne(
    `
    SELECT
      (SELECT COUNT(*) FROM reportes_mantenimiento) AS total_documentos,
      (SELECT COUNT(*) FROM reportes_mantenimiento WHERE estado = 'borrador') AS borrador,
      (SELECT COUNT(*) FROM reportes_mantenimiento WHERE estado = 'en_revision') AS en_revision,
      (SELECT COUNT(*) FROM reportes_mantenimiento WHERE estado = 'aprobado') AS aprobados,
      (SELECT COUNT(*) FROM reportes_mantenimiento WHERE estado = 'publicado') AS publicados
    `,
  );
  return json(summary || {});
}

export async function listDocuments({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "documentos", "read");
  await ensureReportesMantenimientoSchema(s);

  const rows = await s.query(
    `
    SELECT rm.id, rm.codigo, rm.version, rm.estado, rm.fecha_reporte,
           rm.archivo_url, m.tipo AS tipo_mantenimiento
    FROM reportes_mantenimiento rm
    LEFT JOIN mantenimientos m ON m.id = rm.id_mantenimiento
    ORDER BY rm.fecha_reporte DESC, rm.id DESC
    LIMIT 200
    `,
  );
  return json({ items: rows, total: rows.length });
}

export async function createMaintenanceReport({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "documentos", "create");
  await ensureReportesMantenimientoSchema(s);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    form = new FormData();
  }

  const file = form.get("archivo");
  if (!(file instanceof File) || !file.name) {
    return json({ message: "Adjunta un archivo PDF" }, 400);
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return json({ message: "El documento debe ser PDF" }, 400);
  }

  const rawMantenimientoId = String(form.get("id_mantenimiento") ?? "").trim();
  const mantenimientoId = /^[+-]?\d+$/.test(rawMantenimientoId) ? Number.parseInt(rawMantenimientoId, 10) : 0;
  if (!mantenimientoId) {
    return json({ message: "Falta el mantenimiento vinculado" }, 400);
  }

  const maintenanceExists = await s.queryOne("SELECT id FROM mantenimientos WHERE id = :id LIMIT 1", { id: mantenimientoId });
  if (!maintenanceExists) {
    return json({ message: "Mantenimiento no encontrado" }, 404);
  }

  const filename = secureFilename(file.name) || "reporte.pdf";
  const storedName = `${randomUUID().replace(/-/g, "")}_${filename}`;
  await fs.promises.writeFile(path.join(reportsUploadDir(), storedName), Buffer.from(await file.arrayBuffer()));

  const codigo = String(form.get("codigo") || "") || (await nextReportCode(s, mantenimientoId));
  const version = String(form.get("version") || "") || "1.0";
  const estado = String(form.get("estado") || "") || "publicado";
  const fechaReporte = String(form.get("fecha_reporte") || "");
  if (!fechaReporte) {
    return json({ message: "La fecha del reporte es obligatoria" }, 400);
  }

  const archivoUrl = `/api/documents/files/${storedName}`;
  const result = await s.execute(
    `
    INSERT INTO reportes_mantenimiento (
      codigo, id_mantenimiento, version, estado, fecha_reporte, archivo_url
    )
    VALUES (
      :codigo, :id_mantenimiento, :version, :estado, :fecha_reporte, :archivo_url
    )
    `,
    {
      codigo,
      id_mantenimiento: mantenimientoId,
      version,
      estado,
      fecha_reporte: fechaReporte,
      archivo_url: archivoUrl,
    },
  );
  await s.commit();
  return json({ message: "Reporte PDF registrado", id: result.lastrowid, archivo_url: archivoUrl }, 201);
}

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json",
};

export async function getDocumentFile({ request, s, params }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  await requirePermission(s, user, "documentos", "read");

  const parts = Array.isArray(params.filename) ? params.filename : [String(params.filename || "")];
  const relative = parts.map((part) => decodeURIComponent(part)).join("/");
  const baseDir = reportsUploadDir();
  const target = path.resolve(baseDir, relative);
  if (!target.startsWith(baseDir + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    return json({ message: "Ruta no encontrada" }, 404);
  }

  const contentType = MIME_TYPES[path.extname(target).toLowerCase()] || "application/octet-stream";
  const data = await fs.promises.readFile(target);
  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(data.length),
      "Content-Disposition": `inline; filename="${path.basename(target)}"`,
    },
  });
}
