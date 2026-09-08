"use client";

import { use } from "react";
import { ProcessingForm } from "@/components/features/samples/ProcessingForm";
import { RecordLoader } from "@/components/features/samples/RecordLoader";
import { RequireModule } from "@/components/session/RequireModule";

export default function EditarProcesamientoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireModule modules="muestras">
      <RecordLoader url={`/samples/processing/${id}`}>{(item) => <ProcessingForm key={String(item.id)} item={item} />}</RecordLoader>
    </RequireModule>
  );
}
