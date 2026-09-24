/*
 * Modelo de permisos (Fase 1; "Roles y permisos FICOTOX", FX-MO-2-1, seccion 5).
 * Compartido entre servidor y cliente.
 *
 * Un permiso es (rol, modulo, accion, alcance). Acciones:
 *   V Visualizar · C Crear/capturar · E Editar borrador · R Revisar ·
 *   A Aprobar/validar/liberar · AN Anular con justificacion · G Administrar.
 * C, E, R, A y AN implican V; G implica todas las acciones del modulo.
 * El alcance limita la accion; "total" = sin limite. Los permisos efectivos de
 * una persona son la union de sus roles vigentes; para un mismo modulo y
 * accion vale cualquiera de sus alcances (gana el mas amplio).
 */

export const MODULOS = [
  { clave: "usuarios", nombre: "Usuarios y roles", descripcion: "Cuentas, roles y asignacion de roles" },
  { clave: "documentos", nombre: "Documentos SGC", descripcion: "Documentos controlados (apagado por ahora)" },
  { clave: "muestras", nombre: "Muestras", descripcion: "Recepcion, custodia y disposicion final" },
  { clave: "ensayos", nombre: "Ensayos", descripcion: "Procesamiento, extraccion y analisis (revision y aprobacion de analisis)" },
  { clave: "informes", nombre: "Informes", descripcion: "Informes de resultados" },
  { clave: "equipos", nombre: "Equipos", descripcion: "Equipos y mantenimientos" },
  { clave: "inventario", nombre: "Inventario", descripcion: "Reactivos, consumibles y movimientos" },
  { clave: "calidad", nombre: "Calidad", descripcion: "Bitacora de auditoria (incidencias, no conformidades y auditorias internas en Fase 8)" },
  { clave: "compras", nombre: "Compras", descripcion: "Sin pantallas todavia (Fase 8)" },
] as const;

export type Modulo = (typeof MODULOS)[number]["clave"];
export const MODULO_KEYS: Modulo[] = MODULOS.map((m) => m.clave);

export const ACCIONES = [
  { clave: "V", nombre: "Visualizar" },
  { clave: "C", nombre: "Crear / capturar" },
  { clave: "E", nombre: "Editar borrador" },
  { clave: "R", nombre: "Revisar" },
  { clave: "A", nombre: "Aprobar / validar / liberar" },
  { clave: "AN", nombre: "Anular con justificación" },
  { clave: "G", nombre: "Administrar / configurar" },
] as const;

export type Accion = (typeof ACCIONES)[number]["clave"];
export const ACCION_KEYS: Accion[] = ACCIONES.map((a) => a.clave);

/*
 * Alcances. `fase` null = se aplica ya. Los diferidos se guardan y se muestran
 * con su fase; mientras no se apliquen se comportan como "total", salvo en el
 * modulo usuarios, donde cualquier alcance diferido se comporta como solo V.
 */
export const ALCANCES = [
  { clave: "total", nombre: "Total", fase: null, descripcion: "Sin limite" },
  { clave: "propio", nombre: "Propio", fase: null, descripcion: "Solo su propia cuenta" },
  { clave: "estado", nombre: "Estado", fase: null, descripcion: "Solo folio, solicitante, fechas y estado; sin datos tecnicos, resultados ni firmas" },
  { clave: "recepcion", nombre: "Recepción", fase: null, descripcion: "Crear y editar solo recepciones" },
  { clave: "preparacion", nombre: "Preparación", fase: null, descripcion: "Crear y editar solo procesamientos" },
  { clave: "borrador", nombre: "Borrador", fase: null, descripcion: "Crear y editar solo mientras el registro esta en borrador o registrado" },
  { clave: "bitacora", nombre: "Bitácora", fase: null, descripcion: "Solo la bitacora de auditoria" },
  { clave: "uso", nombre: "Uso", fase: null, descripcion: "Solo registrar uso y folio de bitacora al capturar extracciones y analisis; no el catalogo" },
  { clave: "mantenimiento", nombre: "Mantenimiento", fase: null, descripcion: "Solo mantenimientos; no el catalogo de equipos" },
  { clave: "movimientos", nombre: "Movimientos", fase: null, descripcion: "Solo movimientos y reposiciones; no el catalogo" },
  { clave: "asignado", nombre: "Asignado", fase: "5", descripcion: "Solo lo que tiene asignado" },
  { clave: "supervisado", nombre: "Supervisado", fase: "2/5", descripcion: "Bajo supervision" },
  { clave: "proyecto", nombre: "Proyecto", fase: "8", descripcion: "Solo su proyecto" },
  { clave: "tecnico", nombre: "Técnico", fase: "7/8", descripcion: "Solo documentos tecnicos" },
  { clave: "investigacion", nombre: "Investigación", fase: "7/8", descripcion: "Solo documentos de investigacion" },
  { clave: "autorizados", nombre: "Autorizados", fase: "7/8", descripcion: "Solo documentos autorizados" },
  { clave: "administrativo", nombre: "Administrativo", fase: "7/8", descripcion: "Solo lo administrativo" },
  { clave: "limitado", nombre: "Limitado", fase: "posterior", descripcion: "Vista limitada" },
  { clave: "incidencias", nombre: "Incidencias", fase: "8", descripcion: "Solo incidencias" },
  { clave: "auditoria", nombre: "Auditorías internas", fase: "8", descripcion: "Solo auditorias internas" },
] as const;

export type Alcance = (typeof ALCANCES)[number]["clave"];
export const ALCANCE_KEYS: Alcance[] = ALCANCES.map((a) => a.clave);
export const ALCANCES_DIFERIDOS = new Set<Alcance>(ALCANCES.filter((a) => a.fase !== null).map((a) => a.clave));

/* Alcances que limitan tambien lo que se ve; los demas solo limitan la operacion. */
const LIMITAN_VISTA = new Set<Alcance>(["propio", "estado", "bitacora"]);

export function isModulo(value: unknown): value is Modulo {
  return typeof value === "string" && (MODULO_KEYS as string[]).includes(value);
}
export function isAccion(value: unknown): value is Accion {
  return typeof value === "string" && (ACCION_KEYS as string[]).includes(value);
}
export function isAlcance(value: unknown): value is Alcance {
  return typeof value === "string" && (ALCANCE_KEYS as string[]).includes(value);
}

export function alcanceLabel(alcance: string): string {
  const meta = ALCANCES.find((a) => a.clave === alcance);
  if (!meta) return alcance;
  return meta.fase ? `${meta.nombre} (se aplica en Fase ${meta.fase})` : meta.nombre;
}

/* Fila de permiso tal como se guarda (rol_acciones). */
export interface PermisoFila {
  modulo: string;
  accion: string;
  alcance: string;
}

/* Permisos efectivos: modulo -> accion -> alcances. */
export type PermisosEfectivos = Partial<Record<Modulo, Partial<Record<Accion, Alcance[]>>>>;
/* Forma que devuelve /api/auth/me: { modulo: { accion: alcance } } (el mas amplio). */
export type PermisosMapa = Partial<Record<Modulo, Partial<Record<Accion, Alcance>>>>;

function add(target: PermisosEfectivos, modulo: Modulo, accion: Accion, alcance: Alcance): void {
  const acciones = (target[modulo] ||= {});
  const lista = (acciones[accion] ||= []);
  if (!lista.includes(alcance)) lista.push(alcance);
}

/*
 * Expande implicaciones (G -> todas; C/E/R/A/AN -> V) y aplica la regla de
 * usuarios (alcance diferido = solo V). Acepta filas de uno o varios roles.
 */
export function expandirPermisos(filas: PermisoFila[]): PermisosEfectivos {
  const out: PermisosEfectivos = {};
  for (const fila of filas) {
    if (!isModulo(fila.modulo) || !isAccion(fila.accion)) continue;
    const alcance: Alcance = isAlcance(fila.alcance) ? fila.alcance : "total";
    const modulo = fila.modulo;
    if (modulo === "usuarios" && ALCANCES_DIFERIDOS.has(alcance)) {
      add(out, modulo, "V", "total");
      continue;
    }
    const acciones: Accion[] = fila.accion === "G" ? ACCION_KEYS : [fila.accion];
    for (const accion of acciones) {
      add(out, modulo, accion, alcance);
      if (accion !== "V") add(out, modulo, "V", LIMITAN_VISTA.has(alcance) || ALCANCES_DIFERIDOS.has(alcance) ? alcance : "total");
    }
  }
  return out;
}

/* Un alcance efectivo equivale a "total" si es total o diferido (todavia no se aplica). */
export function esTotal(alcances: readonly string[] | undefined): boolean {
  return !!alcances && alcances.some((a) => a === "total" || ALCANCES_DIFERIDOS.has(a as Alcance));
}

/* Rango para elegir el alcance "mas amplio": total > diferido > aplicado. */
function rango(alcance: Alcance): number {
  if (alcance === "total") return 0;
  if (ALCANCES_DIFERIDOS.has(alcance)) return 1;
  return 2;
}

export function alcanceMasAmplio(alcances: readonly Alcance[]): Alcance {
  return [...alcances].sort((a, b) => rango(a) - rango(b))[0];
}

export function mapaPermisos(efectivos: PermisosEfectivos): PermisosMapa {
  const out: PermisosMapa = {};
  for (const modulo of MODULO_KEYS) {
    const acciones = efectivos[modulo];
    if (!acciones) continue;
    const fila: Partial<Record<Accion, Alcance>> = {};
    for (const accion of ACCION_KEYS) {
      const lista = acciones[accion];
      if (lista?.length) fila[accion] = alcanceMasAmplio(lista);
    }
    out[modulo] = fila;
  }
  return out;
}

/*
 * Contexto de la operacion para evaluar un alcance aplicado:
 * - objeto: que se toca (recepcion, procesamiento, extraccion, analisis,
 *   equipo, mantenimiento, uso_equipo, catalogo_inventario, movimiento,
 *   bitacora, usuario, informe, documento).
 * - borrador: el registro esta (o queda) en borrador/registrado.
 * - propio: el registro es la cuenta de quien actua.
 */
export interface ContextoAlcance {
  objeto?: string;
  borrador?: boolean;
  propio?: boolean;
}

export function alcancePermite(alcance: Alcance, ctx: ContextoAlcance = {}): boolean {
  if (alcance === "total" || ALCANCES_DIFERIDOS.has(alcance)) return true;
  switch (alcance) {
    case "propio":
      return ctx.propio === true;
    case "estado":
      // Solo acota lo que se devuelve; la vista se permite y se recorta en el servidor.
      return true;
    case "recepcion":
      return ctx.objeto === "recepcion";
    case "preparacion":
      return ctx.objeto === "procesamiento";
    case "borrador":
      return ctx.borrador === true;
    case "bitacora":
      return !ctx.objeto || ctx.objeto === "bitacora";
    case "uso":
      return ctx.objeto === "uso_equipo";
    case "mantenimiento":
      return ctx.objeto === "mantenimiento";
    case "movimientos":
      return ctx.objeto === "movimiento";
    default:
      return false;
  }
}

/* ¿Alguno de los alcances permite la operacion en este contexto? */
export function permite(efectivos: PermisosEfectivos, modulo: Modulo, accion: Accion, ctx?: ContextoAlcance): boolean {
  const lista = efectivos[modulo]?.[accion];
  if (!lista?.length) return false;
  if (!ctx) return true;
  return lista.some((alcance) => alcancePermite(alcance, ctx));
}

/*
 * Formato compacto del catalogo (scripts/roles-catalogo.json):
 *   { "muestras": { "C": "recepcion", "E": "recepcion" }, "calidad": { "V": "total" } }
 */
export type PermisosCatalogo = Partial<Record<Modulo, Partial<Record<Accion, Alcance>>>>;

export function filasDesdeCatalogo(permisos: PermisosCatalogo): PermisoFila[] {
  const filas: PermisoFila[] = [];
  for (const modulo of MODULO_KEYS) {
    const acciones = permisos[modulo];
    if (!acciones) continue;
    for (const accion of ACCION_KEYS) {
      const alcance = acciones[accion];
      if (alcance) filas.push({ modulo, accion, alcance });
    }
  }
  return filas;
}

/* Clave estable de un conjunto de filas, para comparar matrices. */
export function firmaFilas(filas: PermisoFila[]): string {
  return filas
    .map((f) => `${f.modulo}:${f.accion}:${f.alcance}`)
    .sort()
    .join("|");
}
