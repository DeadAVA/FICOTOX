"use client";

import { useMemo, useState } from "react";
import { ArrowSquareOut, FileText } from "@phosphor-icons/react";
import { PageBody } from "@/components/shell/AppShell";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { PageHeader, SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { Badge, EmptyState, ErrorState, Stat, TableSkeleton, type Tone } from "@/components/ui/Primitives";
import { CellPrimary, Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { fmt, fmtDate, normalizeText } from "@/lib/client/format";
import { useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";

const ESTADOS: Record<string, { label: string; tone: Tone }> = {
  borrador: { label: "Borrador", tone: "neutral" },
  en_revision: { label: "En revisión", tone: "warning" },
  aprobado: { label: "Aprobado", tone: "brand" },
  publicado: { label: "Publicado", tone: "success" },
};

export default function DocumentosPage() {
  return (
    <RequireModule modules="documentos">
      <DocumentosContent />
    </RequireModule>
  );
}

function DocumentosContent() {
  const { token } = useSession();
  const [search, setSearch] = useState("");

  const resource = useResource<{ items: ApiRecord[]; summary: ApiRecord }>(
    "documentos",
    async () => {
      const [list, summary] = await Promise.all([getJsonAuth(`${API_BASE_URL}/documents`, token), getJsonAuth(`${API_BASE_URL}/documents/summary`, token).catch(() => ({}))]);
      return { items: (list.items || []) as ApiRecord[], summary: summary as ApiRecord };
    },
    { enabled: !!token },
  );

  const rows = useMemo(() => {
    const list = resource.data?.items || [];
    const term = normalizeText(search);
    return term ? list.filter((item) => normalizeText(`${item.codigo || ""} ${item.tipo_mantenimiento || ""} ${item.estado || ""}`).includes(term)) : list;
  }, [resource.data, search]);

  const summary = resource.data?.summary || {};

  const openFile = (item: ApiRecord) => {
    const raw = String(item.archivo_url || "");
    if (!raw) return;
    const url = raw.startsWith("http") || raw.startsWith("/") ? raw : `${API_BASE_URL}/documents/files/${raw.split("/").pop()}`;
    window.open(`${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`, "_blank", "noopener");
  };

  return (
    <PageBody>
      <PageHeader title="Documentos" description="Documentos del sistema de gestión de calidad y reportes de mantenimiento en PDF." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Documentos" value={fmt(summary.total_documentos || rows.length)} />
        <Stat label="Borrador" value={fmt(summary.borrador || 0)} />
        <Stat label="En revisión" value={fmt(summary.en_revision || 0)} tone={summary.en_revision ? "warning" : "neutral"} />
        <Stat label="Aprobados" value={fmt(summary.aprobados || 0)} tone="brand" />
        <Stat label="Publicados" value={fmt(summary.publicados || 0)} tone="success" />
      </div>

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por código, tipo o estado" className="w-full md:w-[360px]" />
      </Toolbar>

      <TableShell footer={resource.data ? `${fmt(rows.length)} documentos` : undefined}>
        {resource.error ? (
          <ErrorState message={resource.error} onRetry={resource.reload} />
        ) : !resource.data ? (
          <TableSkeleton cols={5} />
        ) : !rows.length ? (
          <EmptyState icon={<FileText size={20} />} title="Sin documentos" description="Los reportes de mantenimiento generados en PDF aparecerán aquí." />
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
              {rows.map((item) => {
                const meta = ESTADOS[String(item.estado || "")] || { label: item.estado || "-", tone: "neutral" as Tone };
                return (
                  <Tr key={item.id}>
                    <Td>
                      <CellPrimary title={item.codigo || "-"} mono />
                    </Td>
                    <Td muted className="capitalize">
                      {item.tipo_mantenimiento || "-"}
                    </Td>
                    <Td muted>{item.version || "-"}</Td>
                    <Td>
                      <Badge tone={meta.tone} dot>
                        {meta.label}
                      </Badge>
                    </Td>
                    <Td muted>{fmtDate(item.fecha_reporte)}</Td>
                    <Td align="right">
                      {item.archivo_url ? (
                        <Button variant="ghost" size="sm" iconRight={<ArrowSquareOut size={14} />} onClick={() => openFile(item)}>
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
    </PageBody>
  );
}
