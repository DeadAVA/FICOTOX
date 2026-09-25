"use client";

/*
 * Autorizaciones propias (FX-THF-AP, Fase 4) para los avisos de los formatos y
 * "Mi cuenta". El servidor valida al guardar; esto solo avisa antes.
 */
import { useCallback } from "react";
import { useSession } from "@/components/session/SessionProvider";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { useResource } from "@/lib/client/store";
import { faltantes, mensajeFaltante, type AutorizacionPersonal, type Requisito } from "@/lib/shared/autorizaciones";

export function useAutorizaciones() {
  const { token } = useSession();
  const resource = useResource<{ items: AutorizacionPersonal[]; obligatorias: boolean }>(
    "autorizaciones",
    async () => {
      const data = await getJsonAuth(`${API_BASE_URL}/autorizaciones/mias`, token);
      return { items: (data.items || []) as AutorizacionPersonal[], obligatorias: data.obligatorias !== false };
    },
    { enabled: !!token },
  );
  const items = resource.data?.items || null;
  /* Texto de lo que falta para esos requisitos, o null (sin datos todavia o validacion desactivada). */
  const falta = useCallback(
    (requisitos: Requisito[]): string | null => {
      if (!resource.data || !resource.data.obligatorias) return null;
      const faltan = faltantes(requisitos, resource.data.items.filter((a) => a.estado === "vigente"));
      return faltan.length ? mensajeFaltante(faltan) : null;
    },
    [resource.data],
  );
  return { items, falta, cargando: !resource.data };
}
