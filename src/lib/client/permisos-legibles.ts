import { ACCION_KEYS, isAccion, isModulo, type Accion, type PermisoFila } from "@/lib/shared/permisos";

/*
 * Permisos de un rol en lenguaje cotidiano (Administración › Roles): nunca
 * letras ni claves. "Muestras: ver y registrar; editar solo las asignadas".
 * Solo presentacion: la matriz y sus reglas no cambian.
 */

/* Areas en el orden en que se muestran (clave del modulo -> nombre). */
export const AREAS_PERMISOS: Array<{ clave: string; nombre: string; detalle: string }> = [
  { clave: "muestras", nombre: "Muestras", detalle: "Recepción, custodia y disposición final" },
  { clave: "ensayos", nombre: "Ensayos", detalle: "Procesamiento, extracción y análisis" },
  { clave: "informes", nombre: "Informes", detalle: "Informes de resultados" },
  { clave: "equipos", nombre: "Equipos", detalle: "Equipos y mantenimientos" },
  { clave: "inventario", nombre: "Inventario", detalle: "Reactivos, consumibles y movimientos" },
  { clave: "calidad", nombre: "Calidad", detalle: "Registro de actividad, incidencias y no conformidades" },
  { clave: "documentos", nombre: "Biblioteca", detalle: "Documentos de consulta" },
  { clave: "usuarios", nombre: "Usuarios", detalle: "Cuentas, roles y autorizaciones" },
  { clave: "compras", nombre: "Compras", detalle: "Todavía sin pantallas" },
];

/* Columnas del editor y verbos de las frases. */
export const ACCIONES_LEGIBLES: Record<Accion, { columna: string; verbo: string }> = {
  V: { columna: "Ver", verbo: "ver" },
  C: { columna: "Crear", verbo: "registrar" },
  E: { columna: "Editar", verbo: "editar" },
  R: { columna: "Revisar", verbo: "revisar" },
  A: { columna: "Aprobar", verbo: "aprobar" },
  AN: { columna: "Anular", verbo: "anular" },
  G: { columna: "Administrar", verbo: "administrar" },
};

/* Alcances en palabras: la opcion del editor y el complemento de la frase. */
export const ALCANCES_LEGIBLES: Record<string, { opcion: string; frase: string }> = {
  total: { opcion: "Todo", frase: "" },
  propio: { opcion: "Solo su propia cuenta", frase: "solo su propia cuenta" },
  estado: { opcion: "Solo el estado", frase: "solo el estado (sin datos técnicos)" },
  recepcion: { opcion: "Solo recepciones", frase: "solo recepciones" },
  preparacion: { opcion: "Solo procesamientos", frase: "solo procesamientos" },
  borrador: { opcion: "Solo en borrador", frase: "solo en borrador" },
  bitacora: { opcion: "Solo el registro de actividad", frase: "solo el registro de actividad" },
  uso: { opcion: "Solo el uso al capturar", frase: "solo el uso de equipos al capturar" },
  mantenimiento: { opcion: "Solo mantenimientos", frase: "solo mantenimientos" },
  movimientos: { opcion: "Solo movimientos", frase: "solo movimientos de inventario" },
  asignado: { opcion: "Solo lo asignado", frase: "solo las asignadas" },
  supervisado: { opcion: "Con visto bueno del supervisor", frase: "con visto bueno de su supervisor" },
  proyecto: { opcion: "Solo su proyecto", frase: "solo su proyecto" },
  tecnico: { opcion: "Lo técnico", frase: "en lo técnico" },
  investigacion: { opcion: "Investigación", frase: "en investigación" },
  autorizados: { opcion: "Solo lo permitido a su rol", frase: "solo los documentos permitidos para su rol" },
  administrativo: { opcion: "Solo lo administrativo", frase: "solo lo administrativo" },
  limitado: { opcion: "Vista limitada", frase: "de forma limitada" },
  incidencias: { opcion: "Solo sus incidencias", frase: "solo sus incidencias y las acciones a su cargo" },
  auditoria: { opcion: "Solo auditorías internas", frase: "solo auditorías internas" },
};

const unir = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`);

/* "Qué puede hacer": una frase por area con permisos (las areas sin permisos no aparecen). */
export function quepuedeHacer(filas: unknown): Array<{ area: string; frase: string }> {
  const porArea = new Map<string, Map<string, Accion[]>>();
  for (const fila of Array.isArray(filas) ? (filas as PermisoFila[]) : []) {
    if (!fila || !isModulo(fila.modulo) || !isAccion(fila.accion)) continue;
    const grupos = porArea.get(fila.modulo) || new Map<string, Accion[]>();
    const alcance = String(fila.alcance || "total");
    grupos.set(alcance, [...(grupos.get(alcance) || []), fila.accion]);
    porArea.set(fila.modulo, grupos);
  }
  const out: Array<{ area: string; frase: string }> = [];
  for (const area of AREAS_PERMISOS) {
    const grupos = porArea.get(area.clave);
    if (!grupos) continue;
    // Administrar todo (G total) lo incluye todo.
    if (grupos.get("total")?.includes("G")) {
      out.push({ area: area.nombre, frase: "puede hacer todo y administrarlo" });
      continue;
    }
    const partes = [...grupos.entries()]
      .sort(([a], [b]) => (a === "total" ? -1 : b === "total" ? 1 : 0))
      .map(([alcance, acciones]) => {
        const verbos = [...new Set(acciones)].sort((x, y) => ACCION_KEYS.indexOf(x) - ACCION_KEYS.indexOf(y)).map((a) => ACCIONES_LEGIBLES[a].verbo);
        const complemento = ALCANCES_LEGIBLES[alcance]?.frase ?? "";
        return [unir(verbos), complemento].filter(Boolean).join(" ");
      });
    out.push({ area: area.nombre, frase: partes.join("; ") });
  }
  return out;
}
