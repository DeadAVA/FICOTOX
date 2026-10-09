import { HttpError } from "./http";
import type { Session } from "./db";
import { toFloatOrNull, toIntOrNull } from "./modules/helpers";

/*
 * Movimientos manuales de inventario (reactivos y consumibles): entrada, salida,
 * consumo y ajuste por conteo físico. La existencia solo cambia por movimientos.
 * - entrada: suma `cantidad`.
 * - salida / consumo: resta `cantidad` (no puede dejar la existencia en negativo).
 * - ajuste: `cantidad` es lo contado físicamente; se registra la diferencia con signo.
 */

export const TIPOS_MOVIMIENTO_MANUAL = ["entrada", "salida", "consumo", "ajuste"] as const;
export type TipoMovimientoManual = (typeof TIPOS_MOVIMIENTO_MANUAL)[number];

const TABLAS_VINCULO: Record<string, string> = {
  recepcion: "muestras_recepcion",
  procesamiento: "muestras_procesamiento",
  extraccion: "muestras_extraccion",
  analisis: "muestras_analisis",
};

const ETIQUETA_VINCULO: Record<string, string> = { recepcion: "Recepción", procesamiento: "Procesamiento", extraccion: "Extracción", analisis: "Análisis" };

export interface MovimientoManual {
  tipo: TipoMovimientoManual;
  /* Cambio con signo sobre la existencia. */
  delta: number;
  /* Lo que queda en el historial (positiva; con signo en los ajustes). */
  cantidad: number;
  motivo: string;
  vinculoTipo: string | null;
  vinculoId: number | null;
}

export async function interpretarMovimiento(s: Session, payload: Record<string, unknown>, existencia: number): Promise<MovimientoManual> {
  const tipo = String(payload.tipo || "entrada").trim().toLowerCase() as TipoMovimientoManual;
  if (!TIPOS_MOVIMIENTO_MANUAL.includes(tipo)) throw new HttpError(400, { message: "El tipo de movimiento debe ser entrada, salida, consumo o ajuste" });
  const cantidad = toFloatOrNull(payload.cantidad);
  if (cantidad === null || Number.isNaN(cantidad)) throw new HttpError(400, { message: tipo === "ajuste" ? "Captura la cantidad contada" : "Captura una cantidad mayor a cero" });
  if (tipo === "ajuste" ? cantidad < 0 : cantidad <= 0) throw new HttpError(400, { message: tipo === "ajuste" ? "La cantidad contada no puede ser negativa" : "Captura una cantidad mayor a cero" });

  const motivoLibre = String(payload.motivo || "").trim();
  if (tipo === "ajuste" && !motivoLibre) throw new HttpError(400, { message: "Indica el motivo del ajuste (por ejemplo, «Conteo físico de enero»)" });
  const motivo = motivoLibre || (tipo === "entrada" ? "Relleno manual de stock" : tipo === "consumo" ? "Consumo registrado" : "Salida registrada");

  let delta = cantidad;
  let registrada = cantidad;
  if (tipo === "salida" || tipo === "consumo") {
    if (cantidad > existencia + 1e-9) throw new HttpError(400, { message: "No hay existencia suficiente para esa cantidad" });
    delta = -cantidad;
  } else if (tipo === "ajuste") {
    delta = Math.round((cantidad - existencia) * 1e6) / 1e6;
    registrada = delta;
  }

  const vinculoTipo = String(payload.vinculo_tipo || "").trim().toLowerCase() || null;
  const folio = toIntOrNull(payload.vinculo_folio);
  let vinculoId = toIntOrNull(payload.vinculo_id);
  let motivoFinal = motivo;
  if (vinculoTipo || folio !== null || vinculoId !== null) {
    const tabla = vinculoTipo ? TABLAS_VINCULO[vinculoTipo] : undefined;
    if (!tabla || (folio === null && vinculoId === null)) throw new HttpError(400, { message: "El vínculo debe indicar el tipo (recepción, procesamiento, extracción o análisis) y su folio" });
    const fila =
      folio !== null
        ? await s.queryOne<{ id: number; folio_num: number }>(`SELECT id, folio_num FROM ${tabla} WHERE folio_num = :n ORDER BY id DESC LIMIT 1`, { n: folio })
        : await s.queryOne<{ id: number; folio_num: number }>(`SELECT id, folio_num FROM ${tabla} WHERE id = :n LIMIT 1`, { n: vinculoId });
    if (!fila) throw new HttpError(400, { message: "La muestra o el análisis vinculado no existe" });
    vinculoId = Number(fila.id);
    motivoFinal = `${motivo} · ${ETIQUETA_VINCULO[vinculoTipo as string]} ${fila.folio_num}`;
  }
  return { tipo, delta, cantidad: registrada, motivo: motivoFinal, vinculoTipo, vinculoId };
}
