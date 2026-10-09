/*
 * Biblioteca de documentos (reemplaza el flujo de control documental de
 * Documentos SGC por decision confirmada del laboratorio). Modulo de permisos:
 * "documentos".
 *
 *   Ver la biblioteca y leer        documentos:V (alcance "autorizados": solo lo visible para todos o para su rol)
 *   Subir documento o nueva version documentos:C
 *   Editar datos                    documentos:E del propio documento, o documentos:G
 *   Archivar / restaurar            documentos:AN o documentos:G, con motivo y reautenticacion
 *   Administrar categorias          documentos:G
 *
 * Archivos: <instancia>/biblioteca/<documento_id>/<uuid>.<ext>, con la misma
 * infraestructura de los adjuntos de la Fase 10 (validacion por firma de bytes,
 * escritura atomica, SHA-256, verificacion al abrir o descargar). Nada se
 * borra: los documentos se archivan con motivo y las versiones se conservan.
 * Abrir o leer no se registra en la bitacora; descargar si.
 */
import fs from "node:fs";
import path from "node:path";
import { requireUser, type CurrentUser } from "../auth";
import { registrarAuditoria } from "../audit";
import { contentDisposition, descartarArchivo, guardarArchivoEn, integridadArchivo, rutaEn, validarArchivoSubido, type ArchivoGuardado } from "../adjuntos";
import { getConfig } from "../config";
import { type Row, type Session } from "../db";
import { HttpError, intParam, json, readJson, type RouteContext } from "../http";
import { cargarAutorizacion, cargoActuante, permisoDe, type Autorizacion } from "../rbac";
import { exigirReauth } from "../seguridad";
import { incidenciaPorAlertaIntegridad } from "./calidad/automaticas";
import { EXTENSIONES_BIBLIOTECA, MIME_BIBLIOTECA, MOTIVO_MIN_BIBLIOTECA, TEXTO_MAX, TIPOS_ARCHIVO, normalizarEtiquetas } from "../../shared/biblioteca";

const T = { doc: "biblioteca_documentos", ver: "biblioteca_versiones", cat: "biblioteca_categorias", vis: "biblioteca_visibilidad_roles" };
const ENTIDAD = "biblioteca_documentos";

const bibliotecaDir = () => path.join(/*turbopackIgnore: true*/ getConfig().INSTANCE_DIR, "biblioteca");
const ahora = () => new Date().toISOString();

/* ---------- Acceso ---------- */

interface Acceso {
  auth: Autorizacion;
  yo: number;
  /* Alcance "autorizados": solo documentos para todos o para alguno de sus roles. */
  restringido: boolean;
  rolIds: number[];
  puede: { subir: boolean; administrar: boolean; archivar: boolean; editarPropios: boolean };
}

async function acceso(s: Session, user: CurrentUser): Promise<Acceso> {
  const auth = await cargarAutorizacion(s, user);
  const ver = permisoDe(auth, "documentos", "V");
  if (!ver) throw new HttpError(403, { message: "No tienes permiso para ver la biblioteca", codigo: "sin_permiso" });
  const restringido = ver.alcances.length > 0 && ver.alcances.every((a) => a === "autorizados");
  const administrar = !!permisoDe(auth, "documentos", "G");
  return {
    auth,
    yo: auth.userId,
    restringido,
    rolIds: auth.roles.map((r) => Number(r.id)),
    puede: {
      // "borrador" (Tecnico Analista) cuenta como subir documentos nuevos y versiones: no hay flujo de revision.
      subir: !!permisoDe(auth, "documentos", "C", { borrador: true, objeto: "documento" }),
      administrar,
      archivar: administrar || !!permisoDe(auth, "documentos", "AN"),
      editarPropios: !!permisoDe(auth, "documentos", "E", { borrador: true, objeto: "documento", propio: true }),
    },
  };
}

const puedeEditar = (a: Acceso, doc: Row) => a.puede.administrar || (a.puede.editarPropios && Number(doc.creado_por) === a.yo);

/* Condicion SQL de visibilidad para el alcance "autorizados". */
function visibleSql(a: Acceso, alias = "d"): { sql: string; params: Record<string, unknown> } {
  if (!a.restringido) return { sql: "", params: {} };
  const ids = a.rolIds.length ? a.rolIds : [-1];
  const params: Record<string, unknown> = {};
  ids.forEach((id, i) => (params[`vr${i}`] = id));
  return { sql: ` AND (${alias}.visibilidad = 'todos' OR EXISTS (SELECT 1 FROM ${T.vis} vr WHERE vr.documento_id = ${alias}.id AND vr.rol_id IN (${ids.map((_, i) => `:vr${i}`).join(", ")})))`, params };
}

/* Documento visible para la persona (404 si no existe o no lo puede ver, como si no existiera). */
async function documentoVisible(s: Session, a: Acceso, id: number): Promise<Row> {
  const v = visibleSql(a);
  const doc = await s.queryOne<Row>(`SELECT d.* FROM ${T.doc} d WHERE d.id = :id${v.sql}`, { id, ...v.params });
  if (!doc) throw new HttpError(404, { message: "Documento no encontrado" });
  return doc;
}

const etiquetasDe = (row: Row): string[] => {
  try {
    const v = JSON.parse(String(row.etiquetas || "[]"));
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
};
const referenciaDe = (doc: Row) => String(doc.clave || doc.titulo || `Documento ${doc.id}`);

async function rolesDe(s: Session, docId: number): Promise<number[]> {
  return (await s.query<Row>(`SELECT rol_id FROM ${T.vis} WHERE documento_id = :id ORDER BY rol_id`, { id: docId })).map((r) => Number(r.rol_id));
}

function serializarVersion(v: Row): Row {
  const { nombre_almacenado: _a, texto: _t, ...resto } = v;
  void _a;
  void _t;
  return { ...resto, con_texto: v.texto !== null && v.texto !== undefined };
}

/* ---------- Integridad (con memoria por fecha y tamano del archivo) ---------- */

type EstadoIntegridad = "ok" | "alterado" | "faltante";
const memoria = new Map<string, { mtimeMs: number; size: number; sha: string; estado: EstadoIntegridad }>();

/* Rapida: recalcula el SHA-256 solo si el archivo cambio de fecha o tamano desde la ultima verificacion (o si `forzar`). */
async function integridadVersion(v: Row, forzar = false): Promise<{ estado: EstadoIntegridad; ruta: string; bytes: Buffer | null; obtenido: string | null }> {
  const ruta = rutaEn(bibliotecaDir(), v.nombre_almacenado);
  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(ruta);
  } catch {
    memoria.delete(ruta);
    return { estado: "faltante", ruta, bytes: null, obtenido: null };
  }
  const previo = memoria.get(ruta);
  if (!forzar && previo && previo.mtimeMs === stat.mtimeMs && previo.size === stat.size && previo.sha === String(v.sha256)) return { estado: previo.estado, ruta, bytes: null, obtenido: null };
  const r = await integridadArchivo(ruta, v.sha256);
  memoria.set(ruta, { mtimeMs: stat.mtimeMs, size: stat.size, sha: String(v.sha256), estado: r.estado });
  return { estado: r.estado, ruta, bytes: r.bytes, obtenido: r.sha256 };
}

/* Archivo alterado o faltante: alerta en la bitacora e incidencia automatica (una por version y estado). */
async function alertar(s: Session, user: CurrentUser, doc: Row, v: Row, estado: EstadoIntegridad, obtenido: string | null): Promise<void> {
  await registrarAuditoria(s, user, { accion: "alerta_integridad", entidad: ENTIDAD, entidadId: Number(doc.id), referencia: referenciaDe(doc), detalle: { version_id: Number(v.id), version: Number(v.numero), nombre: String(v.nombre_original), integridad: estado, esperado: v.sha256, obtenido } });
  await incidenciaPorAlertaIntegridad(s, {
    clave: `biblioteca:${v.id}:${estado}`,
    descripcion: `El archivo "${String(v.nombre_original)}" (versión ${v.numero}) del documento "${String(doc.titulo)}" de la biblioteca ${estado === "faltante" ? "no está en el servidor" : "no coincide con su huella SHA-256"} (alerta de integridad).`,
    registros: [{ entidad: ENTIDAD, entidad_id: Number(doc.id), referencia: referenciaDe(doc) }],
  });
}

/* ---------- Lectura ---------- */

export async function listarBiblioteca({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const a = await acceso(s, user);
  const url = new URL(request.url);
  const search = (url.searchParams.get("search") || "").trim();
  const categoria = Number(url.searchParams.get("categoria") || 0) || 0;
  const tipo = (url.searchParams.get("tipo") || "").trim();
  const archivados = url.searchParams.get("archivados") === "1";
  const orden = url.searchParams.get("orden") || "recientes";
  const v = visibleSql(a);
  const params: Record<string, unknown> = { ...v.params };
  let where = `WHERE 1 = 1${v.sql}`;
  if (!archivados) where += " AND d.archivado_en IS NULL";
  if (categoria) {
    where += " AND d.categoria_id = :categoria";
    params.categoria = categoria;
  }
  const grupo = TIPOS_ARCHIVO.find((t) => t.value === tipo);
  if (grupo) {
    grupo.extensiones.forEach((e, i) => (params[`ext${i}`] = e));
    where += ` AND va.extension IN (${grupo.extensiones.map((_, i) => `:ext${i}`).join(", ")})`;
  }
  if (search) {
    // Titulo, clave, descripcion, etiquetas y el texto extraido de los PDF (version vigente).
    params.like = `%${search}%`;
    where += " AND (d.titulo LIKE :like OR d.clave LIKE :like OR d.descripcion LIKE :like OR d.etiquetas LIKE :like OR va.texto LIKE :like)";
  }
  const orderBy = orden === "az" ? "d.titulo ASC" : orden === "categoria" ? "c.orden ASC, d.titulo ASC" : "COALESCE(va.subido_en, d.creado_en) DESC";
  const rows = await s.query<Row>(
    `SELECT d.id, d.titulo, d.descripcion, d.categoria_id, d.clave, d.etiquetas, d.fecha_documento, d.visibilidad, d.version_actual_id, d.creado_por, d.creado_en,
            d.actualizado_en, d.archivado_en, d.motivo_archivo, c.nombre AS categoria, u.nombre AS creado_por_nombre,
            va.numero AS version, va.extension, va.tamano_bytes, va.sha256, va.subido_en, va.nombre_original
     FROM ${T.doc} d
     LEFT JOIN ${T.ver} va ON va.id = d.version_actual_id
     LEFT JOIN ${T.cat} c ON c.id = d.categoria_id
     LEFT JOIN usuarios u ON u.id = d.creado_por
     ${where}
     ORDER BY ${orderBy}
     LIMIT 1000`,
    params,
  );
  const categorias = await s.query<Row>(`SELECT id, nombre, orden, activa FROM ${T.cat} ORDER BY orden, nombre`);
  return json({
    items: rows.map((r) => ({ ...r, etiquetas: etiquetasDe(r), puede: { editar: puedeEditar(a, r), archivar: a.puede.archivar, subir_version: a.puede.subir && !r.archivado_en } })),
    categorias,
    puede: { subir: a.puede.subir, administrar: a.puede.administrar, archivar: a.puede.archivar },
    max_mb: getConfig().BIBLIOTECA_MAX_MB,
  });
}

export async function obtenerDocumento({ request, s, params }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const a = await acceso(s, user);
  const doc = await documentoVisible(s, a, intParam(params.id));
  const versiones = await s.query<Row>(`SELECT v.*, u.nombre AS subido_por_nombre FROM ${T.ver} v LEFT JOIN usuarios u ON u.id = v.subido_por WHERE v.documento_id = :id ORDER BY v.numero DESC`, { id: doc.id });
  const categoria = doc.categoria_id ? await s.queryOne<Row>(`SELECT nombre FROM ${T.cat} WHERE id = :id`, { id: doc.categoria_id }) : null;
  const creador = doc.creado_por ? await s.queryOne<Row>("SELECT nombre FROM usuarios WHERE id = :id", { id: doc.creado_por }) : null;
  // Al abrir se verifica la version vigente (rapido si no cambio); si esta alterada o falta: alerta e incidencia.
  const actual = versiones.find((v) => Number(v.id) === Number(doc.version_actual_id)) || versiones[0] || null;
  let integridad: EstadoIntegridad | null = null;
  if (actual) {
    const r = await integridadVersion(actual);
    integridad = r.estado;
    if (r.estado !== "ok") {
      await alertar(s, user, doc, actual, r.estado, r.obtenido);
      await s.commit();
    }
  }
  const roles = doc.visibilidad === "roles" ? await s.query<Row>(`SELECT r.id, r.nombre FROM ${T.vis} vr JOIN roles r ON r.id = vr.rol_id WHERE vr.documento_id = :id ORDER BY r.nombre`, { id: doc.id }) : [];
  return json({
    item: { ...doc, etiquetas: etiquetasDe(doc), categoria: categoria?.nombre || null, creado_por_nombre: creador?.nombre || null, roles, integridad },
    versiones: versiones.map(serializarVersion),
    puede: { editar: puedeEditar(a, doc), archivar: a.puede.archivar, subir_version: a.puede.subir && !doc.archivado_en },
  });
}

/* Integridad de una version concreta (el visor la consulta al abrir una version anterior). */
export async function verificarVersion({ request, s, params }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const a = await acceso(s, user);
  const v = await s.queryOne<Row>(`SELECT * FROM ${T.ver} WHERE id = :id`, { id: intParam(params.vid) });
  if (!v) throw new HttpError(404, { message: "Versión no encontrada" });
  const doc = await documentoVisible(s, a, Number(v.documento_id));
  const r = await integridadVersion(v);
  if (r.estado !== "ok") {
    await alertar(s, user, doc, v, r.estado, r.obtenido);
    await s.commit();
  }
  return json({ integridad: r.estado });
}

/*
 * Archivo de una version. modo=ver: en linea, sin bitacora (abrir o leer no se
 * registra), con soporte de Range para la carga progresiva de PDF grandes.
 * modo=descargar: adjunto, con bitacora. Un archivo faltante responde 404; uno
 * alterado se sirve marcado (X-Integridad-Archivo) para que el visor avise; en
 * ambos casos al descargar se registra la alerta y la incidencia.
 */
export async function archivoVersion({ request, s, params }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const a = await acceso(s, user);
  const v = await s.queryOne<Row>(`SELECT * FROM ${T.ver} WHERE id = :id`, { id: intParam(params.vid) });
  if (!v) throw new HttpError(404, { message: "Versión no encontrada" });
  const doc = await documentoVisible(s, a, Number(v.documento_id));
  const descargar = new URL(request.url).searchParams.get("modo") === "descargar";
  const r = await integridadVersion(v, descargar);
  if (r.estado !== "ok" && descargar) await alertar(s, user, doc, v, r.estado, r.obtenido);
  if (r.estado === "faltante") {
    await s.commit();
    return new Response(JSON.stringify({ message: "El archivo no está en el servidor; se registró una alerta de integridad", codigo: "archivo_faltante" }), { status: 404, headers: { "Content-Type": "application/json", "X-Integridad-Archivo": "faltante" } });
  }
  if (descargar) await registrarAuditoria(s, user, { accion: "descargar", entidad: ENTIDAD, entidadId: Number(doc.id), referencia: referenciaDe(doc), detalle: { version_id: Number(v.id), version: Number(v.numero), nombre: String(v.nombre_original) } });
  await s.commit();
  const ext = String(v.extension);
  const encabezados: Record<string, string> = {
    "Content-Type": MIME_BIBLIOTECA[ext] || "application/octet-stream",
    "Content-Disposition": contentDisposition(descargar ? "attachment" : "inline", String(v.nombre_original)),
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Cache-Control": "private, no-store",
    "X-Archivo-Sha256": String(v.sha256),
    "X-Integridad-Archivo": r.estado,
    "Accept-Ranges": "bytes",
  };
  const stat = await fs.promises.stat(r.ruta);
  const rango = !descargar ? /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") || "") : null;
  if (rango && (rango[1] || rango[2])) {
    let inicio = rango[1] ? Number(rango[1]) : Math.max(0, stat.size - Number(rango[2]));
    let fin = rango[1] && rango[2] ? Number(rango[2]) : stat.size - 1;
    fin = Math.min(fin, stat.size - 1);
    if (inicio > fin || inicio >= stat.size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } });
    inicio = Math.max(0, inicio);
    const largo = fin - inicio + 1;
    const buf = Buffer.alloc(largo);
    const fh = await fs.promises.open(r.ruta, "r");
    try {
      await fh.read(buf, 0, largo, inicio);
    } finally {
      await fh.close();
    }
    return new Response(new Uint8Array(buf), { status: 206, headers: { ...encabezados, "Content-Range": `bytes ${inicio}-${fin}/${stat.size}`, "Content-Length": String(largo) } });
  }
  const bytes = r.bytes || (await fs.promises.readFile(r.ruta));
  return new Response(new Uint8Array(bytes), { status: 200, headers: { ...encabezados, "Content-Length": String(bytes.length) } });
}

/* Texto de un PDF para buscar, extraido en el navegador (documentos copiados del flujo anterior o subidos sin texto). Solo si falta. */
export async function guardarTextoVersion({ request, s, params }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const a = await acceso(s, user);
  const v = await s.queryOne<Row>(`SELECT id, documento_id, texto FROM ${T.ver} WHERE id = :id`, { id: intParam(params.vid) });
  if (!v) throw new HttpError(404, { message: "Versión no encontrada" });
  await documentoVisible(s, a, Number(v.documento_id));
  if (v.texto !== null && v.texto !== undefined) return json({ guardado: false });
  const payload = await readJson(request);
  const texto = String(payload.texto || "").slice(0, TEXTO_MAX);
  await s.execute(`UPDATE ${T.ver} SET texto = :texto WHERE id = :id AND texto IS NULL`, { texto, id: v.id });
  await s.commit();
  return json({ guardado: true });
}

/* ---------- Escritura ---------- */

interface DatosDocumento {
  titulo: string;
  descripcion: string | null;
  categoria_id: number | null;
  clave: string | null;
  etiquetas: string[];
  fecha_documento: string | null;
  visibilidad: "todos" | "roles";
  roles: number[];
}

function datosDe(raw: Record<string, unknown>): DatosDocumento {
  const roles = (Array.isArray(raw.roles) ? raw.roles : String(raw.roles || "").split(",")).map((x) => Number(x)).filter((x) => Number.isInteger(x) && x > 0);
  const fecha = String(raw.fecha_documento || "").trim();
  return {
    titulo: String(raw.titulo || "").trim().replace(/\s+/g, " ").slice(0, 220),
    descripcion: String(raw.descripcion || "").trim().slice(0, 4000) || null,
    categoria_id: Number(raw.categoria_id) || null,
    clave: String(raw.clave || "").trim().slice(0, 60) || null,
    etiquetas: normalizarEtiquetas(raw.etiquetas),
    fecha_documento: /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : null,
    visibilidad: raw.visibilidad === "roles" ? "roles" : "todos",
    roles: [...new Set(roles)],
  };
}

async function validarDatos(s: Session, d: DatosDocumento): Promise<void> {
  if (!d.titulo) throw new HttpError(400, { message: "Indica el título", campo: "titulo" });
  if (d.categoria_id && !(await s.queryOne<Row>(`SELECT id FROM ${T.cat} WHERE id = :id AND activa = 1`, { id: d.categoria_id }))) throw new HttpError(400, { message: "Elige una categoría válida", campo: "categoria" });
  if (d.visibilidad === "roles" && !d.roles.length) throw new HttpError(400, { message: "Elige al menos un rol que pueda verlo", campo: "roles" });
  if (d.roles.length) {
    const existentes = await s.query<Row>(`SELECT id FROM roles WHERE id IN (${d.roles.map((_, i) => `:r${i}`).join(", ")})`, Object.fromEntries(d.roles.map((r, i) => [`r${i}`, r])));
    if (existentes.length !== d.roles.length) throw new HttpError(400, { message: "Elige roles válidos", campo: "roles" });
  }
}

async function guardarVisibilidad(s: Session, docId: number, d: DatosDocumento): Promise<void> {
  // Las asignaciones de visibilidad son configuracion (no registros): se reemplazan y el cambio queda en la bitacora (antes/despues).
  await s.execute(`DELETE FROM ${T.vis} WHERE documento_id = :id`, { id: docId });
  if (d.visibilidad === "roles") for (const rol of d.roles) await s.execute(`INSERT INTO ${T.vis} (documento_id, rol_id) VALUES (:d, :r)`, { d: docId, r: rol });
}

/* Multipart de la biblioteca: archivo + datos (+ texto extraido del PDF en el navegador). */
async function leerSubida(request: Request): Promise<{ campos: Record<string, unknown>; archivo: { nombre_original: string; extension: string; bytes: Buffer } }> {
  const cfg = getConfig();
  const limite = cfg.BIBLIOTECA_MAX_MB * 1024 * 1024;
  const declarado = Number(request.headers.get("content-length") || 0);
  if (declarado && declarado > limite + 2 * 1024 * 1024 + TEXTO_MAX * 4) throw new HttpError(413, { message: `El archivo pesa más de ${cfg.BIBLIOTECA_MAX_MB} MB`, codigo: "archivo_grande" });
  if (!(request.headers.get("content-type") || "").toLowerCase().startsWith("multipart/form-data")) throw new HttpError(400, { message: "Envía el archivo como multipart/form-data (campo archivo)" });
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new HttpError(400, { message: "No se pudo leer el archivo enviado" });
  }
  const archivo = form.get("archivo");
  if (!(archivo instanceof File) || !archivo.name) throw new HttpError(400, { message: "Elige el archivo", campo: "archivo" });
  const campos: Record<string, unknown> = {};
  for (const [k, val] of form.entries()) if (k !== "archivo" && typeof val === "string") campos[k] = val;
  const valido = await validarArchivoSubido(archivo, { limiteBytes: limite, limiteMb: cfg.BIBLIOTECA_MAX_MB, extensiones: EXTENSIONES_BIBLIOTECA });
  return { campos, archivo: valido };
}

async function insertarVersion(s: Session, docId: number, numero: number, archivo: { nombre_original: string; extension: string }, guardado: ArchivoGuardado, extra: { nota: string | null; texto: string | null; por: number | null }): Promise<number> {
  const r = await s.execute(
    `INSERT INTO ${T.ver} (documento_id, numero, nombre_original, nombre_almacenado, mime, extension, tamano_bytes, sha256, nota_version, texto, subido_por, subido_en)
     VALUES (:d, :n, :orig, :alm, :mime, :ext, :tam, :sha, :nota, :texto, :por, :en)`,
    { d: docId, n: numero, orig: archivo.nombre_original, alm: guardado.nombre_almacenado, mime: MIME_BIBLIOTECA[archivo.extension] || "application/octet-stream", ext: archivo.extension, tam: guardado.tamano_bytes, sha: guardado.sha256, nota: extra.nota, texto: extra.texto, por: extra.por, en: ahora() },
  );
  return r.lastrowid as number;
}

const textoDe = (campos: Record<string, unknown>, ext: string) => (ext === "pdf" && typeof campos.texto === "string" && campos.texto.trim() ? campos.texto.slice(0, TEXTO_MAX) : null);
const detalleVersion = (archivo: { nombre_original: string; extension: string }, g: ArchivoGuardado, numero: number) => ({ version: numero, nombre: archivo.nombre_original, extension: archivo.extension, tamano_bytes: g.tamano_bytes, sha256: g.sha256 });

export async function subirDocumento({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const a = await acceso(s, user);
  if (!a.puede.subir) throw new HttpError(403, { message: "No tienes permiso para subir documentos a la biblioteca", codigo: "sin_permiso" });
  const { campos, archivo } = await leerSubida(request);
  const d = datosDe(campos);
  await validarDatos(s, d);
  let guardado: ArchivoGuardado | null = null;
  try {
    const en = ahora();
    const r = await s.execute(
      `INSERT INTO ${T.doc} (titulo, descripcion, categoria_id, clave, etiquetas, fecha_documento, visibilidad, creado_por, creado_en, actualizado_por, actualizado_en)
       VALUES (:titulo, :descripcion, :categoria_id, :clave, :etiquetas, :fecha_documento, :visibilidad, :por, :en, :por, :en)`,
      { ...d, etiquetas: JSON.stringify(d.etiquetas), por: a.yo, en },
    );
    const docId = r.lastrowid as number;
    guardado = await guardarArchivoEn(bibliotecaDir(), String(docId), archivo.extension, archivo.bytes);
    const verId = await insertarVersion(s, docId, 1, archivo, guardado, { nota: String(campos.nota_version || "").trim().slice(0, 1000) || null, texto: textoDe(campos, archivo.extension), por: a.yo });
    await s.execute(`UPDATE ${T.doc} SET version_actual_id = :v WHERE id = :id`, { v: verId, id: docId });
    await guardarVisibilidad(s, docId, d);
    const doc = (await s.queryOne<Row>(`SELECT * FROM ${T.doc} WHERE id = :id`, { id: docId }))!;
    await registrarAuditoria(s, user, { accion: "subir", entidad: ENTIDAD, entidadId: docId, referencia: referenciaDe(doc), detalle: { titulo: d.titulo, ...detalleVersion(archivo, guardado, 1), visibilidad: d.visibilidad } });
    await s.commit();
    return json({ message: "Documento subido a la biblioteca", item: { ...doc, etiquetas: d.etiquetas } }, 201);
  } catch (error) {
    await s.rollback();
    await descartarArchivo(guardado);
    throw error;
  }
}

export async function subirVersion({ request, s, params }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const a = await acceso(s, user);
  if (!a.puede.subir) throw new HttpError(403, { message: "No tienes permiso para subir versiones", codigo: "sin_permiso" });
  const doc = await documentoVisible(s, a, intParam(params.id));
  if (doc.archivado_en) throw new HttpError(409, { message: "El documento está archivado; restáuralo antes de subir una versión nueva", codigo: "archivado" });
  const { campos, archivo } = await leerSubida(request);
  let guardado: ArchivoGuardado | null = null;
  try {
    const numero = Number((await s.scalar(`SELECT MAX(numero) FROM ${T.ver} WHERE documento_id = :id`, { id: doc.id })) || 0) + 1;
    guardado = await guardarArchivoEn(bibliotecaDir(), String(doc.id), archivo.extension, archivo.bytes);
    const verId = await insertarVersion(s, Number(doc.id), numero, archivo, guardado, { nota: String(campos.nota_version || "").trim().slice(0, 1000) || null, texto: textoDe(campos, archivo.extension), por: a.yo });
    await s.execute(`UPDATE ${T.doc} SET version_actual_id = :v, actualizado_por = :por, actualizado_en = :en WHERE id = :id`, { v: verId, por: a.yo, en: ahora(), id: doc.id });
    await registrarAuditoria(s, user, { accion: "subir_version", entidad: ENTIDAD, entidadId: Number(doc.id), referencia: referenciaDe(doc), detalle: { ...detalleVersion(archivo, guardado, numero), nota_version: campos.nota_version || null } });
    await s.commit();
    return json({ message: `Versión ${numero} subida`, version: numero }, 201);
  } catch (error) {
    await s.rollback();
    await descartarArchivo(guardado);
    throw error;
  }
}

const datosVisibles = (doc: Row, roles: number[], categoria: string | null) => ({ titulo: doc.titulo, descripcion: doc.descripcion || null, categoria, clave: doc.clave || null, etiquetas: etiquetasDe(doc).join(", ") || null, fecha_documento: doc.fecha_documento || null, visibilidad: doc.visibilidad, roles: roles.join(", ") || null });

export async function editarDocumento({ request, s, params }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const a = await acceso(s, user);
  const doc = await documentoVisible(s, a, intParam(params.id));
  if (!puedeEditar(a, doc)) throw new HttpError(403, { message: "Solo quien subió el documento o quien administra la biblioteca puede editar sus datos", codigo: "sin_permiso" });
  const d = datosDe(await readJson(request));
  await validarDatos(s, d);
  const rolesAntes = await rolesDe(s, Number(doc.id));
  const catNombre = async (id: unknown) => (id ? String((await s.queryOne<Row>(`SELECT nombre FROM ${T.cat} WHERE id = :id`, { id }))?.nombre || "") : null);
  const antes = datosVisibles(doc, rolesAntes, await catNombre(doc.categoria_id));
  await s.execute(
    `UPDATE ${T.doc} SET titulo = :titulo, descripcion = :descripcion, categoria_id = :categoria_id, clave = :clave, etiquetas = :etiquetas, fecha_documento = :fecha_documento,
       visibilidad = :visibilidad, actualizado_por = :por, actualizado_en = :en WHERE id = :id`,
    { ...d, etiquetas: JSON.stringify(d.etiquetas), por: a.yo, en: ahora(), id: doc.id },
  );
  await guardarVisibilidad(s, Number(doc.id), d);
  const nuevo = (await s.queryOne<Row>(`SELECT * FROM ${T.doc} WHERE id = :id`, { id: doc.id }))!;
  const despues = datosVisibles(nuevo, d.visibilidad === "roles" ? d.roles : [], await catNombre(nuevo.categoria_id));
  await registrarAuditoria(s, user, { accion: "editar", entidad: ENTIDAD, entidadId: Number(doc.id), referencia: referenciaDe(nuevo), antes, despues });
  await s.commit();
  return json({ message: "Datos del documento actualizados", item: { ...nuevo, etiquetas: d.etiquetas } });
}

async function cambiarArchivo(ctx: RouteContext, archivar: boolean): Promise<Response> {
  const { request, s, params } = ctx;
  const user = await requireUser(request);
  const a = await acceso(s, user);
  if (!a.puede.archivar) throw new HttpError(403, { message: `No tienes permiso para ${archivar ? "archivar" : "restaurar"} documentos`, codigo: "sin_permiso" });
  const doc = await documentoVisible(s, a, intParam(params.id));
  const motivo = String((await readJson(request)).motivo || "").trim();
  if (motivo.length < MOTIVO_MIN_BIBLIOTECA) throw new HttpError(400, { message: `Indica el motivo (al menos ${MOTIVO_MIN_BIBLIOTECA} caracteres)`, campo: "motivo" });
  if (archivar === !!doc.archivado_en) throw new HttpError(409, { message: archivar ? "El documento ya está archivado" : "El documento no está archivado" });
  await exigirReauth(s, request, user, "documentos:AN");
  const permiso = permisoDe(a.auth, "documentos", "AN") || permisoDe(a.auth, "documentos", "G");
  const cargo = permiso ? cargoActuante(request, permiso).cargo : null;
  const r = archivar
    ? await s.execute(`UPDATE ${T.doc} SET archivado_en = :en, archivado_por = :por, motivo_archivo = :motivo WHERE id = :id AND archivado_en IS NULL`, { en: ahora(), por: a.yo, motivo, id: doc.id })
    : await s.execute(`UPDATE ${T.doc} SET archivado_en = NULL, archivado_por = NULL, motivo_archivo = NULL, actualizado_por = :por, actualizado_en = :en WHERE id = :id AND archivado_en IS NOT NULL`, { en: ahora(), por: a.yo, id: doc.id });
  if (!r.rowcount) throw new HttpError(409, { message: "Otra persona cambió el documento al mismo tiempo; recarga la página" });
  await registrarAuditoria(s, user, { accion: archivar ? "archivar" : "restaurar", entidad: ENTIDAD, entidadId: Number(doc.id), referencia: referenciaDe(doc), motivo, detalle: { titulo: doc.titulo, ...(cargo ? { actuo_como: { cargo } } : {}), ...(archivar ? {} : { motivo_archivo_anterior: doc.motivo_archivo || null }) } });
  await s.commit();
  return json({ message: archivar ? "Documento archivado" : "Documento restaurado" });
}
export const archivarDocumento = (ctx: RouteContext) => cambiarArchivo(ctx, true);
export const restaurarDocumento = (ctx: RouteContext) => cambiarArchivo(ctx, false);

/* ---------- Categorias ---------- */

export async function listarCategorias({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const a = await acceso(s, user);
  const items = await s.query<Row>(`SELECT c.id, c.nombre, c.orden, c.activa, (SELECT COUNT(*) FROM ${T.doc} d WHERE d.categoria_id = c.id) AS documentos FROM ${T.cat} c ORDER BY c.orden, c.nombre`);
  return json({ items, puede: { administrar: a.puede.administrar } });
}

function exigirAdministrar(a: Acceso): void {
  if (!a.puede.administrar) throw new HttpError(403, { message: "Solo quien administra la biblioteca maneja las categorías", codigo: "sin_permiso" });
}

export async function crearCategoria({ request, s }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const a = await acceso(s, user);
  exigirAdministrar(a);
  const payload = await readJson(request);
  const nombre = String(payload.nombre || "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (!nombre) throw new HttpError(400, { message: "Indica el nombre de la categoría", campo: "nombre" });
  if (await s.queryOne<Row>(`SELECT id FROM ${T.cat} WHERE LOWER(nombre) = LOWER(:n)`, { n: nombre })) throw new HttpError(409, { message: "Ya existe una categoría con ese nombre", campo: "nombre" });
  const orden = Number(payload.orden) || Number((await s.scalar(`SELECT MAX(orden) FROM ${T.cat}`)) || 0) + 1;
  const r = await s.execute(`INSERT INTO ${T.cat} (nombre, orden, activa) VALUES (:n, :o, 1)`, { n: nombre, o: orden });
  await registrarAuditoria(s, user, { accion: "categoria", entidad: "biblioteca_categorias", entidadId: Number(r.lastrowid), referencia: nombre, despues: { nombre, orden, activa: "sí" } });
  await s.commit();
  return json({ message: "Categoría creada", id: r.lastrowid }, 201);
}

export async function editarCategoria({ request, s, params }: RouteContext): Promise<Response> {
  const user = await requireUser(request);
  const a = await acceso(s, user);
  exigirAdministrar(a);
  const id = intParam(params.cid);
  const antes = await s.queryOne<Row>(`SELECT * FROM ${T.cat} WHERE id = :id`, { id });
  if (!antes) throw new HttpError(404, { message: "Categoría no encontrada" });
  const payload = await readJson(request);
  const nombre = payload.nombre === undefined ? String(antes.nombre) : String(payload.nombre || "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (!nombre) throw new HttpError(400, { message: "Indica el nombre de la categoría", campo: "nombre" });
  if (await s.queryOne<Row>(`SELECT id FROM ${T.cat} WHERE LOWER(nombre) = LOWER(:n) AND id <> :id`, { n: nombre, id })) throw new HttpError(409, { message: "Ya existe una categoría con ese nombre", campo: "nombre" });
  const orden = payload.orden === undefined ? Number(antes.orden) : Number(payload.orden) || 0;
  // Las categorias no se borran: se desactivan (sus documentos la conservan).
  const activa = payload.activa === undefined ? Number(antes.activa) : payload.activa ? 1 : 0;
  await s.execute(`UPDATE ${T.cat} SET nombre = :n, orden = :o, activa = :a WHERE id = :id`, { n: nombre, o: orden, a: activa, id });
  await registrarAuditoria(s, user, { accion: "categoria", entidad: "biblioteca_categorias", entidadId: id, referencia: nombre, antes: { nombre: antes.nombre, orden: antes.orden, activa: Number(antes.activa) ? "sí" : "no" }, despues: { nombre, orden, activa: activa ? "sí" : "no" } });
  await s.commit();
  return json({ message: "Categoría actualizada" });
}
