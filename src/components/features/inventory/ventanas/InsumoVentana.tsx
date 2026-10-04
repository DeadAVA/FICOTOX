"use client";

import type { ReactNode } from "react";
import { ArrowCounterClockwise, ArrowsClockwise, Barcode, CalendarBlank, Gauge, MapPin, Package, PencilSimple, Tag, Trash, WarningCircle } from "@phosphor-icons/react";
import { IncidenciasDelRegistro } from "@/components/features/calidad/IncidenciasDelRegistro";
import { Button } from "@/components/ui/Button";
import { Badge, StockMeter } from "@/components/ui/Primitives";
import { ColumnasVentana, DatoLateral, DatosRapidos, TarjetaLateral, VentanaAcciones, VentanaCentrada, VentanaEncabezado, VentanaSeccion, VentanaTarjeta, VentanaTitulo, type DatoRapido } from "@/components/ui/Ventana";
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
    <VentanaCentrada amplia abierta={!!item} onCerrar={onCerrar} onMover={mover} puedeAnterior={indice !== null && indice > 0} puedeSiguiente={indice !== null && indice < items.length - 1} etiquetaAnterior="Anterior" etiquetaSiguiente="Siguiente">
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

/* Existencia como protagonista: cantidad grande, barra con minimo y maximo, y si alcanza o no. */
function TarjetaExistencia({ actual, maximo, minimo, unidad, baja, vacia, nota }: { actual: number | null; maximo: number | null; minimo: number | null; unidad: string; baja: boolean; vacia: boolean; nota: string }) {
  const tono = vacia ? "text-danger" : baja ? "text-warning-text" : "text-ink";
  return (
    <VentanaSeccion titulo="Existencia" i={1}>
      <VentanaTarjeta className="flex flex-col gap-3 px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className={`tnum text-[30px] leading-none font-semibold tracking-[-0.02em] ${tono}`}>
            {actual !== null ? fmt(actual) : "—"}
            <span className="ml-1.5 text-[15px] font-medium text-ink-3">{unidad}</span>
          </p>
          <Badge tone={vacia ? "danger" : baja ? "warning" : "success"} dot>
            {vacia ? "Sin existencia" : baja ? "Existencia baja" : "Existencia suficiente"}
          </Badge>
        </div>
        {actual !== null ? <StockMeter size="lg" current={actual} max={maximo ?? undefined} min={minimo ?? undefined} unit={unidad} low={baja} label={nota} /> : <p className="text-[13.5px] text-ink-3">Todavía no se registra la cantidad.</p>}
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-ink-3">
          {minimo ? <span>Mínimo: {fmt(minimo)} {unidad}</span> : null}
          {maximo ? <span>Máximo: {fmt(maximo)} {unidad}</span> : null}
        </div>
      </VentanaTarjeta>
    </VentanaSeccion>
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
  const ubicacion = getReactivoLocation(item);
  return (
    <div className="flex flex-col gap-6" data-insumo-ventana={String(item.id)}>
      <VentanaEncabezado
        figura={<IconoCategoria categoria={item.tipo_reactivo || item.categoria} grande />}
        titulo={nombre}
        insignia={
          <>
            {inactivo ? <Badge tone="danger">Baja</Badge> : null}
            {cad?.tono === "danger" ? <Badge tone="danger">Vencido</Badge> : cad?.tono === "warning" ? <Badge tone="warning">Por vencer</Badge> : null}
          </>
        }
        subtitulo={[getReactivoTypeLabel(item.tipo_reactivo || item.categoria), item.marca].filter(Boolean).join(" · ")}
      />
      <DatosRapidos datos={datos} />
      <Baja item={item} />
      <ColumnasVentana
        principal={
          <>
            <TarjetaExistencia actual={stock.current} maximo={stock.max ?? null} minimo={stock.min ?? null} unidad={unidad} baja={stock.low} vacia={stock.empty} nota={stock.min ? `Aviso de existencia baja al llegar a ${fmt(stock.min)} ${unidad}` : "Aviso de existencia baja al 20 % de la capacidad"} />
            <VentanaSeccion titulo="Movimientos recientes" i={2}>
              <MovimientosRecientes tabla="reactivos" id={item.id} unidad={unidad} />
            </VentanaSeccion>
            <VentanaSeccion titulo="Incidencias" i={3}>
              <IncidenciasDelRegistro entidad="reactivos" id={item.id} etiqueta={nombre} />
            </VentanaSeccion>
          </>
        }
        lateral={
          <>
            <TarjetaLateral icono={<Barcode size={15} weight="duotone" />} titulo="Identificación" i={0}>
              <DatoLateral etiqueta="Tipo">{getReactivoTypeLabel(item.tipo_reactivo || item.categoria) || "—"}</DatoLateral>
              {item.id_interno ? <DatoLateral etiqueta="ID interno">{String(item.id_interno)}</DatoLateral> : null}
              {item.numero_cas || item.cas_number ? <DatoLateral etiqueta="Número CAS">{String(item.numero_cas || item.cas_number)}</DatoLateral> : null}
              {item.catalogo || item.catalogo_parte_cas_lote ? <DatoLateral etiqueta="Catálogo">{String(item.catalogo || item.catalogo_parte_cas_lote)}</DatoLateral> : null}
              {item.lote ? <DatoLateral etiqueta="Lote">{String(item.lote)}</DatoLateral> : null}
              {item.proveedor || item.vendor ? <DatoLateral etiqueta="Proveedor">{String(item.proveedor || item.vendor)}</DatoLateral> : null}
            </TarjetaLateral>
            <TarjetaLateral icono={<MapPin size={15} weight="duotone" />} titulo="Dónde está" i={1}>
              <DatoLateral etiqueta="Ubicación">{ubicacion || "Sin ubicación"}</DatoLateral>
              {item.contenedor ? <DatoLateral etiqueta="Contenedor">{String(item.contenedor)}</DatoLateral> : null}
            </TarjetaLateral>
            <TarjetaLateral icono={<CalendarBlank size={15} weight="duotone" />} titulo="Fechas" tono={cad?.tono || "neutral"} i={2}>
              <DatoLateral etiqueta="Caducidad">{cad ? `${formatearFecha(getReactivoExpiry(item))}${cad.detalle ? ` · ${cad.detalle}` : ""}` : "Sin fecha de caducidad"}</DatoLateral>
              {item.fecha_apertura ? <DatoLateral etiqueta="Abierto el">{formatearFecha(item.fecha_apertura)}</DatoLateral> : null}
              {item.fecha_ingreso ? <DatoLateral etiqueta="Ingresó el">{formatearFecha(item.fecha_ingreso)}</DatoLateral> : null}
            </TarjetaLateral>
          </>
        }
      />
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
    <div className="flex flex-col gap-6" data-insumo-ventana={String(item.id)}>
      <VentanaEncabezado
        figura={<IconoConsumible producto={item.producto} grande />}
        titulo={nombre}
        insignia={inactivo ? <Badge tone="danger">Baja</Badge> : undefined}
        subtitulo={[item.marca, item.proveedor].filter(Boolean).join(" · ") || undefined}
      />
      <DatosRapidos datos={datos} />
      <Baja item={item} />
      <ColumnasVentana
        principal={
          <>
            <TarjetaExistencia actual={piezas} maximo={maximo || null} minimo={5} unidad="piezas" baja={piezas <= 5} vacia={piezas <= 0} nota="Aviso de existencia baja con 5 piezas o menos" />
            <VentanaSeccion titulo="Movimientos recientes" i={2}>
              <MovimientosRecientes tabla="consumibles" id={item.id} unidad="piezas" />
            </VentanaSeccion>
            <VentanaSeccion titulo="Incidencias" i={3}>
              <IncidenciasDelRegistro entidad="consumibles" id={item.id} etiqueta={nombre} />
            </VentanaSeccion>
          </>
        }
        lateral={
          <>
            <TarjetaLateral icono={<Package size={15} weight="duotone" />} titulo="Presentación" i={0}>
              {item.tamano_capacidad ? <DatoLateral etiqueta="Tamaño o capacidad">{String(item.tamano_capacidad)}</DatoLateral> : null}
              {item.cantidad_por_pieza ? <DatoLateral etiqueta="Cantidad por pieza">{fmt(item.cantidad_por_pieza)}</DatoLateral> : null}
              {item.contenedor ? <DatoLateral etiqueta="Contenedor">{String(item.contenedor)}</DatoLateral> : null}
              {item.catalogo_parte_cas ? <DatoLateral etiqueta="Catálogo">{String(item.catalogo_parte_cas)}</DatoLateral> : null}
              {item.marca ? <DatoLateral etiqueta="Marca">{String(item.marca)}</DatoLateral> : null}
              {item.proveedor ? <DatoLateral etiqueta="Proveedor">{String(item.proveedor)}</DatoLateral> : null}
            </TarjetaLateral>
            <TarjetaLateral icono={<MapPin size={15} weight="duotone" />} titulo="Dónde está" i={1}>
              <DatoLateral etiqueta="Ubicación">{String(item.ubicacion || item.localizacion || "Sin ubicación")}</DatoLateral>
            </TarjetaLateral>
            <TarjetaLateral icono={<CalendarBlank size={15} weight="duotone" />} titulo="Fechas" tono={cad?.tono || "neutral"} i={2}>
              <DatoLateral etiqueta="Caducidad">{cad ? `${formatearFecha(item.caducidad)}${cad.detalle ? ` · ${cad.detalle}` : ""}` : "Sin fecha de caducidad"}</DatoLateral>
              {item.fecha_ingreso ? <DatoLateral etiqueta="Ingresó el">{formatearFechaCorta(item.fecha_ingreso)}</DatoLateral> : null}
              {inactivo && item.baja_en ? <DatoLateral etiqueta="Baja registrada">{formatearFechaHora(item.baja_en)}</DatoLateral> : null}
            </TarjetaLateral>
          </>
        }
      />
      <Acciones item={item} acciones={acciones} />
    </div>
  );
}
