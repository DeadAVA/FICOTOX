"use client";

import Link from "next/link";
import { CalendarBlank, CheckCircle, FilePdf, PencilSimple, Prohibit, User, Wrench } from "@phosphor-icons/react";
import { MANTENIMIENTO_ESTADOS, MANTENIMIENTO_TIPOS, metaFor } from "@/components/features/inventory/meta";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { FiguraPersona } from "@/components/ui/FiguraPersona";
import { Badge } from "@/components/ui/Primitives";
import { DatosLista, DatosRapidos, VentanaAcciones, VentanaCentrada, VentanaEncabezado, VentanaSeccion, VentanaTarjeta, VentanaTitulo } from "@/components/ui/Ventana";
import { API_BASE_URL } from "@/lib/client/api";
import { openProtectedFile } from "@/lib/client/files";
import { fmt } from "@/lib/client/format";
import { origenDeMovimiento, esEntrada, IconoEquipo, IconoMovimiento, moverEn } from "./comun";
import type { ApiRecord } from "@/lib/client/types";
import { formatearFecha, formatearFechaCorta, formatearFechaHora, hoyLocal } from "@/lib/shared/fechas";

/*
 * Ventanas de Mantenimiento (detalle de un mantenimiento con sus acciones de
 * siempre: Editar y Cancelar) y de Movimientos (detalle de una entrada o
 * salida con el registro de origen enlazado).
 */

export const mantenimientoVencido = (m: ApiRecord) => m.estado === "vencido" || (["programado", "en_proceso"].includes(String(m.estado)) && String(m.fecha_programada || "").slice(0, 10) < hoyLocal());

export function MantenimientoVentana({ items, indice, onIndice, onCerrar, puedeEditar, puedeCancelar, editar, cancelar }: { items: ApiRecord[]; indice: number | null; onIndice: (i: number) => void; onCerrar: () => void; puedeEditar: boolean; puedeCancelar: boolean; editar: (m: ApiRecord) => void; cancelar: (m: ApiRecord) => void }) {
  const { token } = useSession();
  const m = indice !== null ? items[indice] : undefined;
  const mover = (paso: number) => {
    const siguiente = moverEn(indice, items.length, paso);
    if (siguiente !== null) onIndice(siguiente);
  };
  return (
    <VentanaCentrada abierta={!!m} onCerrar={onCerrar} onMover={mover} puedeAnterior={indice !== null && indice > 0} puedeSiguiente={indice !== null && indice < items.length - 1} etiquetaAnterior="Anterior" etiquetaSiguiente="Siguiente">
      {m ? (
        <div key={String(m.id)} className="flex flex-col gap-5" data-mantenimiento-ventana={String(m.id)}>
          <VentanaEncabezado
            figura={<IconoEquipo grande tono={mantenimientoVencido(m) ? "bg-danger-soft text-danger" : "bg-brand-faint text-brand-strong"} />}
            titulo={`${metaFor(MANTENIMIENTO_TIPOS, m.tipo).label} · ${String(m.equipo || "Equipo")}`}
            insignia={
              <>
                <Badge tone={metaFor(MANTENIMIENTO_ESTADOS, m.estado).tone} dot>
                  {metaFor(MANTENIMIENTO_ESTADOS, m.estado).label}
                </Badge>
                {mantenimientoVencido(m) && m.estado !== "vencido" ? <Badge tone="danger">Fecha pasada</Badge> : null}
              </>
            }
            subtitulo={[m.equipo_marca, m.equipo_modelo].filter(Boolean).join(" · ") || undefined}
          />
          <DatosRapidos
            datos={[
              { icono: <CalendarBlank size={17} weight="duotone" />, etiqueta: "Programado", valor: formatearFechaCorta(m.fecha_programada), tono: mantenimientoVencido(m) ? "danger" : "brand" },
              { icono: <CheckCircle size={17} weight="duotone" />, etiqueta: "Realizado", valor: m.fecha_realizado ? formatearFechaCorta(m.fecha_realizado) : "Aún no", tono: m.fecha_realizado ? "success" : "neutral" },
              { icono: <Wrench size={17} weight="duotone" />, etiqueta: "Técnico", valor: m.tecnico_proveedor ? String(m.tecnico_proveedor) : "—" },
              { icono: <User size={17} weight="duotone" />, etiqueta: "Responsable", valor: m.responsable ? String(m.responsable) : "—" },
            ]}
          />
          <VentanaSeccion titulo="Detalle" i={1}>
            <DatosLista
              datos={[
                { etiqueta: "Equipo", valor: String(m.equipo || "Equipo sin nombre") },
                { etiqueta: "Tipo", valor: metaFor(MANTENIMIENTO_TIPOS, m.tipo).label },
                { etiqueta: "Fecha programada", valor: formatearFecha(m.fecha_programada) },
                m.fecha_realizado ? { etiqueta: "Fecha en que se realizó", valor: formatearFecha(m.fecha_realizado) } : null,
                m.tecnico_proveedor ? { etiqueta: "Técnico o proveedor", valor: String(m.tecnico_proveedor) } : null,
              ]}
            />
            {m.responsable || m.id_responsable ? <FiguraPersona id={m.id_responsable} nombre={m.responsable} size="md" conNombre subtitulo="Responsable" /> : null}
          </VentanaSeccion>
          {m.observaciones ? (
            <VentanaSeccion titulo="Observaciones" i={2}>
              <VentanaTarjeta>
                <p className="whitespace-pre-line text-[14px] text-ink">{String(m.observaciones)}</p>
              </VentanaTarjeta>
            </VentanaSeccion>
          ) : null}
          {m.reporte_codigo ? (
            <VentanaSeccion titulo="Reporte en PDF" i={3}>
              <div>
                <Button
                  variant="secondary"
                  icon={<FilePdf size={16} />}
                  onClick={() => {
                    const raw = String(m.reporte_pdf_url || "");
                    const url = raw.startsWith("/") ? raw : `${API_BASE_URL}/documents/files/${raw.split("/").pop()}`;
                    void openProtectedFile(url, token, String(m.reporte_codigo || "reporte"));
                  }}
                >
                  Abrir reporte {String(m.reporte_codigo)}
                </Button>
              </div>
            </VentanaSeccion>
          ) : null}
          {puedeEditar || (puedeCancelar && m.estado !== "cancelado") ? (
            <VentanaAcciones>
              {puedeEditar ? (
                <Button icon={<PencilSimple size={16} />} onClick={() => editar(m)}>
                  Editar
                </Button>
              ) : null}
              {puedeCancelar && m.estado !== "cancelado" ? (
                <Button variant="ghost" className="text-danger hover:bg-danger-soft hover:text-danger" icon={<Prohibit size={16} />} onClick={() => cancelar(m)}>
                  Cancelar mantenimiento
                </Button>
              ) : null}
            </VentanaAcciones>
          ) : null}
        </div>
      ) : (
        <VentanaTitulo className="sr-only">Mantenimiento</VentanaTitulo>
      )}
    </VentanaCentrada>
  );
}

export const nombreInsumo = (m: ApiRecord) => String(m.item_nombre || m.item_codigo || "Insumo sin nombre");

export function MovimientoVentana({ items, indice, onIndice, onCerrar }: { items: ApiRecord[]; indice: number | null; onIndice: (i: number) => void; onCerrar: () => void }) {
  const m = indice !== null ? items[indice] : undefined;
  const mover = (paso: number) => {
    const siguiente = moverEn(indice, items.length, paso);
    if (siguiente !== null) onIndice(siguiente);
  };
  const origen = m ? origenDeMovimiento(m) : null;
  const tipoInsumo = m?.tabla_origen === "reactivos" ? "Reactivo" : m?.tabla_origen === "consumibles" ? "Consumible" : "Insumo";
  const fichaInsumo = m ? (m.tabla_origen === "reactivos" ? `/inventario/reactivos?buscar=${encodeURIComponent(nombreInsumo(m))}` : m.tabla_origen === "consumibles" ? `/inventario/consumibles?buscar=${encodeURIComponent(nombreInsumo(m))}` : null) : null;
  return (
    <VentanaCentrada abierta={!!m} onCerrar={onCerrar} onMover={mover} puedeAnterior={indice !== null && indice > 0} puedeSiguiente={indice !== null && indice < items.length - 1} etiquetaAnterior="Movimiento anterior" etiquetaSiguiente="Movimiento siguiente">
      {m && origen ? (
        <div key={String(m.id)} className="flex flex-col gap-5" data-movimiento-ventana={String(m.id)}>
          <VentanaEncabezado
            figura={<IconoMovimiento m={m} grande />}
            titulo={`${esEntrada(m) ? "Entrada" : "Salida"} de ${fmt(m.cantidad)} · ${nombreInsumo(m)}`}
            insignia={<Badge tone={esEntrada(m) ? "success" : "warning"} dot>{esEntrada(m) ? "Entrada" : "Salida"}</Badge>}
            subtitulo={`${tipoInsumo} · ${formatearFechaHora(m.fecha_hora)}`}
          />
          <VentanaSeccion titulo="Detalle" i={1}>
            <DatosLista
              datos={[
                { etiqueta: tipoInsumo, valor: fichaInsumo ? <Link href={fichaInsumo} className="text-brand hover:underline">{nombreInsumo(m)}</Link> : nombreInsumo(m) },
                m.item_codigo && m.item_codigo !== m.item_nombre ? { etiqueta: "Código", valor: String(m.item_codigo) } : null,
                { etiqueta: "Cantidad", valor: fmt(m.cantidad) },
                { etiqueta: "Cuándo", valor: formatearFechaHora(m.fecha_hora) },
                m.motivo ? { etiqueta: "Motivo", valor: String(m.motivo) } : null,
              ]}
            />
          </VentanaSeccion>
          <VentanaSeccion titulo="Registro de origen" i={2}>
            <VentanaTarjeta>
              {origen.href ? (
                <Link href={origen.href} className="text-[14px] font-medium text-brand hover:underline">
                  {origen.texto}
                </Link>
              ) : (
                <p className="text-[14px] text-ink">{origen.texto}</p>
              )}
              <p className="mt-0.5 text-[12.5px] text-ink-3">{origen.href ? "Se descontó al capturar ese formato." : esEntrada(m) ? "Entrada registrada en el inventario." : "Movimiento registrado en el inventario."}</p>
            </VentanaTarjeta>
          </VentanaSeccion>
        </div>
      ) : (
        <VentanaTitulo className="sr-only">Movimiento</VentanaTitulo>
      )}
    </VentanaCentrada>
  );
}
