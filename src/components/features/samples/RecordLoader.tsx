"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSession } from "@/components/session/SessionProvider";
import { ErrorState, Skeleton } from "@/components/ui/Primitives";
import { API_BASE_URL, getJsonAuth, resolveApiEntity } from "@/lib/client/api";
import type { ApiRecord } from "@/lib/client/types";

/* Carga un registro por id y monta el formato con el dato listo (sin parpadeos). */
export function RecordLoader({ url, children }: { url: string; children: (item: ApiRecord) => ReactNode }) {
  const { token } = useSession();
  const [state, setState] = useState<{ item: ApiRecord | null; error: string | null }>({ item: null, error: null });

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getJsonAuth(`${API_BASE_URL}${url}`, token)
      .then((data) => !cancelled && setState({ item: resolveApiEntity(data), error: null }))
      .catch((err) => !cancelled && setState({ item: null, error: err instanceof Error ? err.message : "No se pudo cargar el registro" }));
    return () => {
      cancelled = true;
    };
  }, [url, token]);

  if (state.error) return <ErrorState message={state.error} />;
  if (!state.item) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
          <Skeleton className="hidden h-64 lg:block" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }
  return <>{children(state.item)}</>;
}
