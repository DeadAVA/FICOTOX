"use client";

import Link from "next/link";
import { CalendarBlank, CheckCircle, FilePdf, LinkSimple, PencilSimple, Prohibit, Toolbox, User, Wrench } from "@phosphor-icons/react";
import { MANTENIMIENTO_ESTADOS, MANTENIMIENTO_TIPOS, metaFor } from "@/components/features/inventory/meta";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { FiguraPersona } from "@/components/ui/FiguraPersona";
import { Badge } from "@/components/ui/Primitives";
import { DatosLista, DatosRapidos, VentanaAcciones, VentanaCentrada, VentanaEncabezado, VentanaSeccion, VentanaTarjeta, VentanaTitulo } from "@/components/ui/Ventana";
import { API_BASE_URL } from "@/lib/client/api";
import { openProtectedFile } from "@/lib/client/files";
import { fmt } from "@/lib/client/format";
import { ColumnasVentana, DatoLateral, origenDeMovimiento, esEntrada, IconoEquipo, IconoMantenimiento, IconoMovimiento, moverEn, TarjetaLateral } from "./comun";
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
    <VentanaCentrada amplia abierta={!!m} onCerrar={onCerrar} onMover={mover} puedeAnterior={indice !== null && indice > 0} puedeSiguiente={indice !== null && indice < items.length - 1} etiquetaAnterior="Anterior" etiquetaSiguiente="Siguiente">
      {m ? (
        <div key={String(m.id)} className="flex flex-col gap-6" data-mantenimiento-ventana={String(m.id)}>
          <VentanaEncabezado
            figura={<IconoMantenimiento tipo={m.tipo} vencido={mantenimientoVencido(m)} grande />}
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
          <ColumnasVentana
            principal={
              <>
                <VentanaSeccion titulo="Observaciones" i={1}>
                  <VentanaTarjeta>
                    <p className="whitespace-pre-line text-[14px] text-ink">{m.observaciones ? String(m.observaciones) : "Sin observaciones."}</p>
                  </VentanaTarjeta>
                </VentanaSeccion>
                {m.reporte_codigo ? (
                  <VentanaSeccion titulo="Reporte en PDF" i={2}>
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
              </>
            }
            lateral={
              <>
                <TarjetaLateral icono={<Toolbox size={15} weight="duotone" />} titulo="Equipo" i={0}>
                  <span className="flex items-center gap-3">
                    <IconoEquipo nombre={m.equipo} />
                    <span className="flex min-w-0 flex-col">
                      <span className="break-words text-[14px] font-medium text-ink">{String(m.equipo || "Equipo sin nombre")}</span>
                      {m.equipo_marca || m.equipo_modelo ? <span className="text-[12.5px] text-ink-3">{[m.equipo_marca, m.equipo_modelo].filter(Boolean).join(" · ")}</span> : null}
                    </span>
                  </span>
                  <Link href={`/inventario/equipos?buscar=${encodeURIComponent(String(m.equipo || ""))}`} className="text-[13px] font-medium text-brand hover:underline">
                    Ver el equipo
                  </Link>
                </TarjetaLateral>
                <TarjetaLateral icono={<CalendarBlank size={15} weight="duotone" />} titulo="Fechas" tono={mantenimientoVencido(m) ? "danger" : "neutral"} i={1}>
                  <DatoLateral etiqueta="Programado">{formatearFecha(m.fecha_programada)}</DatoLateral>
                  <DatoLateral etiqueta="Realizado">{m.fecha_realizado ? formatearFecha(m.fecha_realizado) : "Todavía no"}</DatoLateral>
                </TarjetaLateral>
                <TarjetaLateral icono={<User size={15} weight="duotone" />} titulo="Quién lo atiende" i={2}>
                  <DatoLateral etiqueta="Técnico o proveedor">{m.tecnico_proveedor ? String(m.tecnico_proveedor) : "Sin asignar"}</DatoLateral>
                  {m.responsable || m.id_responsable ? <FiguraPersona id={m.id_responsable} nombre={m.responsable} size="md" conNombre subtitulo="Responsable" /> : null}
                </TarjetaLateral>
              </>
            }
          />
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
    <VentanaCentrada amplia abierta={!!m} onCerrar={onCerrar} onMover={mover} puedeAnterior={indice !== null && indice > 0} puedeSiguiente={indice !== null && indice < items.length - 1} etiquetaAnterior="Movimiento anterior" etiquetaSiguiente="Movimiento siguiente">
      {m && origen ? (
        <div key={String(m.id)} className="flex flex-col gap-6" data-movimiento-ventana={String(m.id)}>
          <VentanaEncabezado
            figura={<IconoMovimiento m={m} grande />}
            titulo={`${esEntrada(m) ? "Entrada" : "Salida"} de ${fmt(m.cantidad)} · ${nombreInsumo(m)}`}
            insignia={<Badge tone={esEntrada(m) ? "success" : "warning"} dot>{esEntrada(m) ? "Entrada" : "Salida"}</Badge>}
            subtitulo={`${tipoInsumo} · ${formatearFechaHora(m.fecha_hora)}`}
          />
          <ColumnasVentana
            principal={
              <VentanaSeccion titulo="Detalle" i={1}>
                <VentanaTarjeta>
                  <DatosLista
                    datos={[
                      { etiqueta: tipoInsumo, valor: fichaInsumo ? <Link href={fichaInsumo} className="text-brand hover:underline">{nombreInsumo(m)}</Link> : nombreInsumo(m) },
                      m.item_codigo && m.item_codigo !== m.item_nombre ? { etiqueta: "Código", valor: String(m.item_codigo) } : null,
                      { etiqueta: "Cantidad", valor: `${esEntrada(m) ? "+" : "−"}${fmt(m.cantidad)}` },
                      { etiqueta: "Cuándo", valor: formatearFechaHora(m.fecha_hora) },
                      m.motivo ? { etiqueta: "Motivo", valor: String(m.motivo) } : null,
                    ]}
                  />
                </VentanaTarjeta>
              </VentanaSeccion>
            }
            lateral={
              <TarjetaLateral icono={<LinkSimple size={15} weight="duotone" />} titulo="Registro de origen" tono={esEntrada(m) ? "success" : "warning"} i={0}>
                {origen.href ? (
                  <Link href={origen.href} className="text-[14px] font-medium text-brand hover:underline">
                    {origen.texto}
                  </Link>
                ) : (
                  <p className="text-[14px] text-ink">{origen.texto}</p>
                )}
                <p className="text-[12.5px] text-ink-3">{origen.href ? "Se descontó al capturar ese formato." : esEntrada(m) ? "Entrada registrada en el inventario." : "Movimiento registrado en el inventario."}</p>
              </TarjetaLateral>
            }
          />
        </div>
      ) : (
        <VentanaTitulo className="sr-only">Movimiento</VentanaTitulo>
      )}
    </VentanaCentrada>
  );
}
