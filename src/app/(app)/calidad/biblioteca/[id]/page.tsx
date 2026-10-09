"use client";

import { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";
import { Visor } from "@/components/features/biblioteca/visor/Visor";
import type { DocumentoBiblioteca, VersionBiblioteca } from "@/components/features/biblioteca/visor/tipos";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { ErrorState, Skeleton } from "@/components/ui/Primitives";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { explicarError } from "@/lib/client/mensajes";
import { useResource } from "@/lib/client/store";

/* Visor de un documento de la biblioteca (Calidad › Biblioteca › documento). ?version=<id> abre una version anterior. */
export default function VisorDocumentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireModule modules="documentos">
      <Suspense fallback={<Skeleton className="m-6 h-[480px]" />}>
        <VisorDocumento id={id} />
      </Suspense>
    </RequireModule>
  );
}

function VisorDocumento({ id }: { id: string }) {
  const { token } = useSession();
  const buscar = useSearchParams();
  const versionId = Number(buscar.get("version")) || null;
  const recurso = useResource<{ item: DocumentoBiblioteca; versiones: VersionBiblioteca[] }>(["biblioteca", `biblioteca:${id}`], async () => {
    const data = await getJsonAuth(`${API_BASE_URL}/biblioteca/${encodeURIComponent(id)}`, token);
    return { item: data.item as DocumentoBiblioteca, versiones: (data.versiones || []) as VersionBiblioteca[] };
  }, { enabled: !!token });
  if (recurso.error) return <div className="p-6"><ErrorState message={explicarError(new Error(recurso.error), "No se pudo abrir el documento").que} onRetry={recurso.reload} /></div>;
  if (!recurso.data) return <Skeleton className="m-6 h-[480px]" />;
  return <Visor item={recurso.data.item} versiones={recurso.data.versiones} versionId={versionId} />;
}
