"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { EmptyState, Skeleton } from "@/components/ui/Primitives";
import { SegmentedTabs } from "@/components/ui/PageHeader";
import { Badge, type Tone } from "@/components/ui/Primitives";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import type { ApiRecord } from "@/lib/client/types";
import { ETIQUETA_ESTADO_SOLICITUD, type EstadoSolicitud } from "@/lib/shared/acciones-criticas";
import { formatearFechaHora } from "@/lib/shared/fechas";
import { AuditTimeline } from "./AuditTimeline";

/*
 * Historial de un registro: la parte de la bitacora de auditoria que le
 * corresponde, contada en frases (quien hizo que, cuando y por que), y (Fase 3)
 * sus solicitudes de autorizacion de un segundo usuario.
 */

const TONO_SOLICITUD: Record<string, Tone> = { pendiente: "warning", aprobada: "success", rechazada: "danger", cancelada: "neutral", vencida: "neutral" };

export function RecordHistory({ entidad, entidadId, compact = false }: { entidad: string; entidadId: number | string | null | undefined; compact?: boolean }) {
  const { token } = useSession();
  const [items, setItems] = useState<ApiRecord[] | null>(null);
  const [solicitudes, setSolicitudes] = useState<ApiRecord[] | null>(null);
  const [tab, setTab] = useState<"bitacora" | "solicitudes">("bitacora");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !entidadId) return;
    try {
      const data = await getJsonAuth(`${API_BASE_URL}/audit?entidad=${encodeURIComponent(entidad)}&entidad_id=${encodeURIComponent(String(entidadId))}&limit=100`, token);
      setItems((data.items || []) as ApiRecord[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el historial");
    }
    // Las solicitudes solo existen para los registros con acciones criticas; si la consulta falla no se rompe la bitacora.
    try {
      const data = await getJsonAuth(`${API_BASE_URL}/solicitudes?entidad=${encodeURIComponent(entidad)}&entidad_id=${encodeURIComponent(String(entidadId))}`, token);
      setSolicitudes((data.items || []) as ApiRecord[]);
    } catch {
      setSolicitudes([]);
    }
  }, [token, entidad, entidadId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  if (!entidadId) return <p className="text-[13px] text-ink-3">El historial aparece una vez guardado el registro.</p>;
  if (error) return <p className="text-[13px] text-danger">{error}</p>;
  if (!items) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    );
  }
  const pendientes = (solicitudes || []).filter((sol) => sol.estado === "pendiente").length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedTabs
          size="sm"
          label="Historial"
          value={tab}
          onChange={setTab}
          options={[
            { value: "bitacora", label: "Bitácora", count: items.length },
            { value: "solicitudes", label: "Solicitudes", count: solicitudes?.length || 0, tone: pendientes ? "warning" : "neutral" },
          ]}
        />
        <Button variant="ghost" size="sm" icon={<ArrowsClockwise size={14} />} onClick={load}>
          Actualizar
        </Button>
      </div>
      {tab === "bitacora" ? (
        items.length ? (
          <>
            <p className="text-[12.5px] text-ink-3">{items.length === 1 ? "1 movimiento" : `${items.length} movimientos`}, del más reciente al más antiguo.</p>
            <AuditTimeline items={items} className={compact ? "text-[13px]" : undefined} />
          </>
        ) : (
          <EmptyState compact title="Sin movimientos" description="Este registro todavía no tiene entradas en la bitácora." />
        )
      ) : (solicitudes || []).length ? (
        <ul className={`flex flex-col gap-2 ${compact ? "text-[13px]" : "text-[13.5px]"}`} aria-label="Solicitudes de autorización">
          {(solicitudes || []).map((sol) => (
            <li key={String(sol.id)} className="rounded-[12px] bg-surface-2 px-3 py-2.5 ring-1 ring-line">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-ink">
                  #{String(sol.id)} · {String(sol.etiqueta)}
                </p>
                <Badge tone={TONO_SOLICITUD[String(sol.estado)] || "neutral"}>{ETIQUETA_ESTADO_SOLICITUD[String(sol.estado) as EstadoSolicitud] || String(sol.estado)}</Badge>
              </div>
              <p className="mt-0.5 text-ink-2">Motivo: {String(sol.motivo || "—")}</p>
              <p className="tnum mt-0.5 text-[12px] text-ink-3">
                Pidió {String(sol.solicitado_nombre || `usuario #${String(sol.solicitado_por)}`)}
                {sol.solicitado_rol ? ` (${String(sol.solicitado_rol)})` : ""} · {formatearFechaHora(sol.solicitado_en)}
                {sol.estado === "pendiente" ? ` · vence ${formatearFechaHora(sol.vence_en)}` : ""}
              </p>
              {sol.estado !== "pendiente" ? (
                <p className="tnum mt-0.5 text-[12px] text-ink-3">
                  {sol.resuelto_nombre ? `${String(sol.resuelto_nombre)}${sol.resuelto_rol ? ` (${String(sol.resuelto_rol)})` : ""} · ` : ""}
                  {formatearFechaHora(sol.resuelto_en)}
                  {sol.motivo_resolucion ? ` · ${String(sol.motivo_resolucion)}` : ""}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState compact title="Sin solicitudes" description="Este registro no ha requerido la autorización de un segundo usuario." />
      )}
    </div>
  );
}
