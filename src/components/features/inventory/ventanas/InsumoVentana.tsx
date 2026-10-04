"use client";

import type { ReactNode } from "react";
import { ArrowCounterClockwise, ArrowsClockwise, CalendarBlank, Gauge, PencilSimple, Tag, Trash, WarningCircle } from "@phosphor-icons/react";
import { IncidenciasDelRegistro } from "@/components/features/calidad/IncidenciasDelRegistro";
import { Button } from "@/components/ui/Button";
import { Badge, StockMeter } from "@/components/ui/Primitives";
import { DatosLista, DatosRapidos, VentanaAcciones, VentanaCentrada, VentanaEncabezado, VentanaSeccion, VentanaTarjeta, VentanaTitulo, type DatoRapido } from "@/components/ui/Ventana";
import { fmt, parseNumberOrNull } from "@/lib/client/format";
import { formatReactivoName, getReactivoExpiry, getReactivoLocation, getReactivoStockState, getReactivoTypeLabel } from "@/lib/client/reactivos";
import type { ApiRecord } from "@/lib/client/types";
import { formatearFecha, formatearFechaCorta, formatearFechaHora } from "@/lib/shared/fechas";
import { caducidadDe, IconoCategoria, IconoConsumible, MovimientosRecientes, moverEn } from "./comun";

/*
 * Ventana de un reactivo o un consumible (Inventario): encabezado con icono de
 * su categoria, datos rapidos (existencia, minimo, caducidad, lote),
 * existencia con barra, identificacion y resguardo, movimientos recientes,
 * incidencias que lo mencionan y las acciones de siempre (Reponer, Editar,
 * Dar de baja o Reactivar), segun permisos.
 */

export interface AccionesInsumo {
  puedeReponer: boolean;
  puedeEditar: boolean;
  puedeBaja: boolean;
  puedeReactivar: boolean;
  reponer: (item: ApiRecord) => void;
  editar: (item: ApiRecord) => void;
  darDeBaja: (item: ApiRecord) => void;
  reactivar: (item: ApiRecord) => void;
}

export function InsumoVentana({ tipo, items, indice, onIndice, onCerrar, acciones }: { tipo: "reactivo" | "consumible"; items: ApiRecord[]; indice: number | null; onIndice: (i: number) => void; onCerrar: () => void; acciones: AccionesInsumo }) {
  const item = indice !== null ? items[indice] : undefined;
  const mover = (paso: number) => {
    const siguiente = moverEn(indice, items.length, paso);
    if (siguiente !== null) onIndice(siguiente);
  };
  return (
    <VentanaCentrada abierta={!!item} onCerrar={onCerrar} onMover={mover} puedeAnterior={indice !== null && indice > 0} puedeSiguiente={indice !== null && indice < items.length - 1} etiquetaAnterior="Anterior" etiquetaSiguiente="Siguiente">
      {item ? tipo === "reactivo" ? <FichaReactivo key={String(item.id)} item={item} acciones={acciones} /> : <FichaConsumible key={String(item.id)} item={item} acciones={acciones} /> : <VentanaTitulo className="sr-only">Detalle</VentanaTitulo>}
    </VentanaCentrada>
  );
}

function Acciones({ item, acciones }: { item: ApiRecord; acciones: AccionesInsumo }) {
  const inactivo = Number(item.activo ?? 1) === 0;
  const botones: ReactNode[] = [];
  if (acciones.puedeReponer && !inactivo)
    botones.push(
      <Button key="r" icon={<ArrowsClockwise size={16} />} onClick={() => acciones.reponer(item)}>
        Reponer
      </Button>,
    );
  if (acciones.puedeEditar)
    botones.push(
      <Button key="e" variant="secondary" icon={<PencilSimple size={16} />} onClick={() => acciones.editar(item)}>
        Editar
      </Button>,
    );
  if (inactivo && acciones.puedeReactivar)
    botones.push(
      <Button key="a" variant="secondary" icon={<ArrowCounterClockwise size={16} />} onClick={() => acciones.reactivar(item)}>
        Reactivar
      </Button>,
    );
  if (!inactivo && acciones.puedeBaja)
    botones.push(
      <Button key="b" variant="ghost" className="text-danger hover:bg-danger-soft hover:text-danger" icon={<Trash size={16} />} onClick={() => acciones.darDeBaja(item)}>
        Dar de baja
      </Button>,
    );
  return botones.length ? <VentanaAcciones>{botones}</VentanaAcciones> : null;
}

function Baja({ item }: { item: ApiRecord }) {
  if (Number(item.activo ?? 1) !== 0) return null;
  return (
    <VentanaTarjeta className="bg-danger-soft/50 ring-danger/15">
      <p className="text-[14px] font-medium text-ink">Dado de baja{item.baja_en ? ` el ${formatearFecha(item.baja_en)}` : ""}</p>
      {item.baja_motivo ? <p className="mt-0.5 text-[13.5px] text-ink-2">Motivo: {String(item.baja_motivo)}</p> : null}
    </VentanaTarjeta>
  );
}

function FichaReactivo({ item, acciones }: { item: ApiRecord; acciones: AccionesInsumo }) {
  const nombre = formatReactivoName(item);
  const stock = getReactivoStockState(item);
  const cad = caducidadDe(getReactivoExpiry(item));
  const inactivo = Number(item.activo ?? 1) === 0;
  const unidad = stock.unit || "";
  const datos: DatoRapido[] = [
    { icono: <Gauge size={17} weight="duotone" />, etiqueta: "Existencia", valor: stock.current !== null ? `${fmt(stock.current)} ${unidad}`.trim() : "Sin registro", tono: stock.empty ? "danger" : stock.low ? "warning" : "brand" },
    { icono: <WarningCircle size={17} weight="duotone" />, etiqueta: "Mínimo", valor: stock.min ? `${fmt(stock.min)} ${unidad}`.trim() : "20 %", titulo: stock.min ? undefined : "Sin mínimo: avisa al 20 % de la capacidad" },
    { icono: <CalendarBlank size={17} weight="duotone" />, etiqueta: "Caducidad", valor: cad ? cad.texto : "Sin fecha", tono: cad?.tono || "brand", titulo: cad?.detalle || undefined },
    { icono: <Tag size={17} weight="duotone" />, etiqueta: "Lote", valor: item.lote ? String(item.lote) : "—" },
  ];
  return (
    <div className="flex flex-col gap-5" data-insumo-ventana={String(item.id)}>
      <VentanaEncabezado
        figura={<IconoCategoria categoria={item.tipo_reactivo || item.categoria} grande />}
        titulo={nombre}
        insignia={
          <>
            {inactivo ? <Badge tone="danger">Baja</Badge> : null}
            {cad?.tono === "danger" ? <Badge tone="danger">Vencido</Badge> : cad?.tono === "warning" ? <Badge tone="warning">Por vencer</Badge> : null}
            {stock.empty ? <Badge tone="danger">Vacío</Badge> : stock.low ? <Badge tone="warning">Existencia baja</Badge> : null}
          </>
        }
        subtitulo={[getReactivoTypeLabel(item.tipo_reactivo || item.categoria), item.marca].filter(Boolean).join(" · ")}
      />
      <DatosRapidos datos={datos} />
      <Baja item={item} />
      {stock.current !== null ? (
        <VentanaSeccion titulo="Existencia" i={1}>
          <StockMeter size="lg" current={stock.current} max={stock.max} min={stock.min} unit={unidad} low={stock.low} label={stock.min ? `Aviso de existencia baja al llegar a ${fmt(stock.min)} ${unidad}` : "Aviso de existencia baja al 20 % de la capacidad"} />
        </VentanaSeccion>
      ) : null}
      <VentanaSeccion titulo="Identificación y resguardo" i={2}>
        <DatosLista
          datos={[
            item.id_interno ? { etiqueta: "ID interno", valor: String(item.id_interno) } : null,
            item.numero_cas || item.cas_number ? { etiqueta: "Número CAS", valor: String(item.numero_cas || item.cas_number) } : null,
            item.catalogo || item.catalogo_parte_cas_lote ? { etiqueta: "Catálogo", valor: String(item.catalogo || item.catalogo_parte_cas_lote) } : null,
            item.proveedor || item.vendor ? { etiqueta: "Proveedor", valor: String(item.proveedor || item.vendor) } : null,
            { etiqueta: "Ubicación", valor: getReactivoLocation(item) },
            cad ? { etiqueta: "Caducidad", valor: `${formatearFecha(getReactivoExpiry(item))}${cad.detalle ? ` · ${cad.detalle}` : ""}` } : null,
            item.fecha_apertura ? { etiqueta: "Abierto el", valor: formatearFecha(item.fecha_apertura) } : null,
          ]}
        />
      </VentanaSeccion>
      <VentanaSeccion titulo="Movimientos recientes" i={3}>
        <MovimientosRecientes tabla="reactivos" id={item.id} unidad={unidad} />
      </VentanaSeccion>
      <VentanaSeccion titulo="Incidencias" i={4}>
        <IncidenciasDelRegistro entidad="reactivos" id={item.id} etiqueta={nombre} />
      </VentanaSeccion>
      <Acciones item={item} acciones={acciones} />
    </div>
  );
}

function FichaConsumible({ item, acciones }: { item: ApiRecord; acciones: AccionesInsumo }) {
  const nombre = String(item.producto || "Consumible");
  const piezas = parseNumberOrNull(item.piezas) ?? 0;
  const maximo = parseNumberOrNull(item.stock_maximo) || piezas;
  const inactivo = Number(item.activo ?? 1) === 0;
  const cad = caducidadDe(item.caducidad);
  const datos: DatoRapido[] = [
    { icono: <Gauge size={17} weight="duotone" />, etiqueta: "Existencia", valor: `${fmt(piezas)} ${piezas === 1 ? "pieza" : "piezas"}`, tono: piezas <= 0 ? "danger" : piezas <= 5 ? "warning" : "brand" },
    { icono: <WarningCircle size={17} weight="duotone" />, etiqueta: "Mínimo", valor: "5 piezas", titulo: "Aviso de existencia baja con 5 piezas o menos" },
    { icono: <CalendarBlank size={17} weight="duotone" />, etiqueta: "Caducidad", valor: cad ? cad.texto : "Sin fecha", tono: cad?.tono || "brand" },
    { icono: <Tag size={17} weight="duotone" />, etiqueta: "Lote", valor: item.lote ? String(item.lote) : "—" },
  ];
  return (
    <div className="flex flex-col gap-5" data-insumo-ventana={String(item.id)}>
      <VentanaEncabezado
        figura={<IconoConsumible grande />}
        titulo={nombre}
        insignia={
          <>
            {inactivo ? <Badge tone="danger">Baja</Badge> : null}
            {piezas <= 0 ? <Badge tone="danger">Agotado</Badge> : piezas <= 5 ? <Badge tone="warning">Existencia baja</Badge> : null}
          </>
        }
        subtitulo={[item.marca, item.proveedor].filter(Boolean).join(" · ") || undefined}
      />
      <DatosRapidos datos={datos} />
      <Baja item={item} />
      <VentanaSeccion titulo="Existencia" i={1}>
        <StockMeter size="lg" current={piezas} max={maximo} min={5} unit="piezas" low={piezas <= 5} label="Aviso de existencia baja con 5 piezas o menos" />
      </VentanaSeccion>
      <VentanaSeccion titulo="Presentación y resguardo" i={2}>
        <DatosLista
          datos={[
            item.catalogo_parte_cas ? { etiqueta: "Catálogo", valor: String(item.catalogo_parte_cas) } : null,
            item.cantidad_por_pieza ? { etiqueta: "Cantidad por pieza", valor: fmt(item.cantidad_por_pieza) } : null,
            item.tamano_capacidad ? { etiqueta: "Tamaño o capacidad", valor: String(item.tamano_capacidad) } : null,
            item.contenedor ? { etiqueta: "Contenedor", valor: String(item.contenedor) } : null,
            item.ubicacion || item.localizacion ? { etiqueta: "Ubicación", valor: String(item.ubicacion || item.localizacion) } : null,
            item.fecha_ingreso ? { etiqueta: "Ingresó el", valor: formatearFechaCorta(item.fecha_ingreso) } : null,
            item.stock_maximo ? { etiqueta: "Existencia máxima", valor: `${fmt(item.stock_maximo)} piezas` } : null,
          ]}
        />
      </VentanaSeccion>
      <VentanaSeccion titulo="Movimientos recientes" i={3}>
        <MovimientosRecientes tabla="consumibles" id={item.id} unidad="piezas" />
      </VentanaSeccion>
      <VentanaSeccion titulo="Incidencias" i={4}>
        <IncidenciasDelRegistro entidad="consumibles" id={item.id} etiqueta={nombre} />
      </VentanaSeccion>
      {inactivo && item.baja_en ? <p className="text-[12.5px] text-ink-3">Baja registrada el {formatearFechaHora(item.baja_en)}.</p> : null}
      <Acciones item={item} acciones={acciones} />
    </div>
  );
}
