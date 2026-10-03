"use client";

import { ArrowSquareOut, FileText } from "@phosphor-icons/react";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Badge, EmptyState, ErrorState, TableSkeleton, type Tone } from "@/components/ui/Primitives";
import { CellPrimary, Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { openProtectedFile } from "@/lib/client/files";
import { fmt, fmtDate } from "@/lib/client/format";
import { useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";

/*
 * Reportes de mantenimiento en PDF (modulo equipos). Antes vivian en una
 * pestaña de Documentos SGC; al convertirse Documentos en la Biblioteca pasan
 * aqui, junto a los mantenimientos que los generan. Misma API (/api/documents).
 */
const REPORTE_ESTADOS: Record<string, { label: string; tone: Tone }> = {
  borrador: { label: "Borrador", tone: "neutral" },
  en_revision: { label: "En revisión", tone: "warning" },
  aprobado: { label: "Aprobado", tone: "brand" },
  publicado: { label: "Publicado", tone: "success" },
};

export function ReportesMantenimiento() {
  const { token } = useSession();
  const recurso = useResource<ApiRecord[]>(["mantenimientos", "reportes-mantenimiento"], async () => ((await getJsonAuth(`${API_BASE_URL}/documents`, token)).items || []) as ApiRecord[], { enabled: !!token });
  const abrir = (item: ApiRecord) => {
    const raw = String(item.archivo_url || "");
    const url = raw.startsWith("/") ? raw : `${API_BASE_URL}/documents/files/${raw.split("/").pop()}`;
    void openProtectedFile(url, token, String(item.codigo || "reporte"));
  };
  const items = recurso.data || [];
  return (
    <section className="mt-8 flex flex-col gap-3" aria-labelledby="reportes-mant" data-reportes-mantenimiento>
      <h2 id="reportes-mant" className="title-3 text-ink">
        Reportes de mantenimiento (PDF)
      </h2>
      <TableShell footer={recurso.data ? `${fmt(items.length)} reportes` : undefined}>
        {recurso.error ? (
          <ErrorState message={recurso.error} onRetry={recurso.reload} />
        ) : !recurso.data ? (
          <TableSkeleton cols={5} />
        ) : !items.length ? (
          <EmptyState compact icon={<FileText size={20} />} title="Sin reportes" description="Los reportes en PDF se generan desde el menú de cada mantenimiento." />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Código</Th>
                <Th>Tipo</Th>
                <Th>Versión</Th>
                <Th>Estado</Th>
                <Th>Fecha</Th>
                <Th align="right" />
              </tr>
            </THead>
            <TBody>
              {items.map((item) => {
                const meta = REPORTE_ESTADOS[String(item.estado || "")] || { label: String(item.estado || "-"), tone: "neutral" as Tone };
                return (
                  <Tr key={String(item.id)}>
                    <Td>
                      <CellPrimary title={String(item.codigo || "-")} mono />
                    </Td>
                    <Td muted className="capitalize">
                      {String(item.tipo_mantenimiento || "-")}
                    </Td>
                    <Td muted>{String(item.version || "-")}</Td>
                    <Td>
                      <Badge tone={meta.tone} dot>
                        {meta.label}
                      </Badge>
                    </Td>
                    <Td muted>{fmtDate(item.fecha_reporte)}</Td>
                    <Td align="right">
                      {item.archivo_url ? (
                        <Button variant="ghost" size="sm" iconRight={<ArrowSquareOut size={14} />} onClick={() => abrir(item)}>
                          Abrir PDF
                        </Button>
                      ) : null}
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </TableShell>
    </section>
  );
}
