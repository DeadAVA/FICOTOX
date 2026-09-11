"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { EmptyState, Skeleton } from "@/components/ui/Primitives";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import type { ApiRecord } from "@/lib/client/types";
import { AuditTimeline } from "./AuditTimeline";

/*
 * Historial de un registro: la parte de la bitacora de auditoria que le
 * corresponde, contada en frases (quien hizo que, cuando y por que).
 */

export function RecordHistory({ entidad, entidadId, compact = false }: { entidad: string; entidadId: number | string | null | undefined; compact?: boolean }) {
  const { token } = useSession();
  const [items, setItems] = useState<ApiRecord[] | null>(null);
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
  if (!items.length) return <EmptyState compact title="Sin movimientos" description="Este registro todavía no tiene entradas en la bitácora." />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-ink-3">
          {items.length === 1 ? "1 movimiento" : `${items.length} movimientos`}, del más reciente al más antiguo.
        </p>
        <Button variant="ghost" size="sm" icon={<ArrowsClockwise size={14} />} onClick={load}>
          Actualizar
        </Button>
      </div>
      <AuditTimeline items={items} className={compact ? "text-[13px]" : undefined} />
    </div>
  );
}
