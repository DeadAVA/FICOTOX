"use client";

import { Callout } from "@/components/features/samples/FormLayout";
import { useSession } from "@/components/session/SessionProvider";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { fmtDate } from "@/lib/client/format";
import { useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";

/*
 * Aviso en los formatos de extraccion y analisis (Fase 11): el metodo o un
 * equipo elegido esta suspendido por una NC. Guardar responderia 409; el aviso
 * lo anticipa con la NC que lo suspendio.
 */
export function AvisoSuspension({ metodo, equipoIds }: { metodo: string | null; equipoIds: Array<string | number | null | undefined> }) {
  const { token } = useSession();
  const recurso = useResource<ApiRecord>("calidad", () => getJsonAuth(`${API_BASE_URL}/calidad/suspensiones/activas`, token), { enabled: !!token });
  const activas = (recurso.data?.items || []) as ApiRecord[];
  const equipos = new Set(equipoIds.filter(Boolean).map(String));
  const aplican = activas.filter((su) => (su.tipo === "metodo" && metodo && su.clave === metodo) || (su.tipo === "equipo" && equipos.has(String(su.clave))));
  if (!aplican.length) return null;
  return (
    <div data-aviso-suspension>
      <Callout tone="danger" title="Trabajo suspendido por una no conformidad">
        {aplican.map((su) => `${su.tipo === "metodo" ? `Método ${su.clave}` : `Equipo ${su.equipo || `#${su.clave}`}`} suspendido por ${su.nc} desde ${fmtDate(su.desde)}`).join(" · ")}. No se puede guardar un registro que lo use hasta que calidad lo reanude.
      </Callout>
    </div>
  );
}
