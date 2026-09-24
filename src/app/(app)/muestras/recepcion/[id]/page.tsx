"use client";

import Link from "next/link";
import { use } from "react";
import { ArrowLeft } from "@phosphor-icons/react";
import { PageBody } from "@/components/shell/AppShell";
import { Callout } from "@/components/features/samples/FormLayout";
import { ReceptionForm } from "@/components/features/samples/ReceptionForm";
import { RecordLoader } from "@/components/features/samples/RecordLoader";
import { SampleStatus } from "@/components/features/samples/status";
import { RequireModule } from "@/components/session/RequireModule";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, DetailRow } from "@/components/ui/Primitives";
import { fmtDate } from "@/lib/client/format";
import { formatSampleFolio } from "@/lib/client/samples";
import type { ApiRecord } from "@/lib/client/types";

export default function EditarRecepcionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireModule modules="muestras">
      <RecordLoader url={`/samples/reception/${id}`}>{(item) => (item.solo_estado ? <RecepcionSoloEstado item={item} /> : <ReceptionForm key={String(item.id)} item={item} />)}</RecordLoader>
    </RequireModule>
  );
}

/*
 * Alcance "estado" (muestras:V): el servidor solo entrega folio, solicitante,
 * fechas y estado. Se muestra una ficha de seguimiento en lugar del formato,
 * para no presentar como incompleto un registro que simplemente no se puede ver.
 */
function RecepcionSoloEstado({ item }: { item: ApiRecord }) {
  return (
    <PageBody>
      <PageHeader
        eyebrow={
          <Link href="/muestras/recepcion" className="inline-flex items-center gap-1 text-ink-3 hover:text-ink">
            <ArrowLeft size={13} /> Recepción
          </Link>
        }
        title={`Recepción ${formatSampleFolio(item)}`}
        description="Seguimiento del estado de la muestra."
      />
      <Card className="flex max-w-[640px] flex-col gap-4">
        <DetailRow label="Estado">
          <SampleStatus status={item.estado} />
        </DetailRow>
        <DetailRow label="Solicitante">{String(item.solicitante || "—")}</DetailRow>
        <DetailRow label="Fecha de recepción">{item.fecha_recepcion ? `${fmtDate(item.fecha_recepcion)}${item.hora_recepcion ? ` · ${item.hora_recepcion}` : ""}` : "—"}</DetailRow>
        <DetailRow label="Fecha de muestreo">{item.fecha_muestra ? fmtDate(item.fecha_muestra) : "—"}</DetailRow>
        <DetailRow label="Fecha de emisión">{item.fecha_emision ? fmtDate(item.fecha_emision) : "—"}</DetailRow>
        <Callout tone="info" title="Sin acceso a datos técnicos">
          Tu alcance en Muestras es solo el estado: folio, solicitante, fechas y estado. La inspección, los análisis, los resultados y las firmas no se muestran.
        </Callout>
      </Card>
    </PageBody>
  );
}
