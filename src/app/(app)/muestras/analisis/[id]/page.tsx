"use client";

import { use } from "react";
import { AnalysisForm } from "@/components/features/samples/AnalysisForm";
import { RecordLoader } from "@/components/features/samples/RecordLoader";
import { RequireModule } from "@/components/session/RequireModule";

export default function EditarAnalisisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireModule modules="muestras">
      <RecordLoader url={`/samples/analysis/${id}`} keys={["muestras"]}>{(item) => <AnalysisForm key={`${item.id}-${item.estado}`} item={item} />}</RecordLoader>
    </RequireModule>
  );
}
