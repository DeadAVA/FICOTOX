"use client";

import { use } from "react";
import { ExtractionForm } from "@/components/features/samples/ExtractionForm";
import { RecordLoader } from "@/components/features/samples/RecordLoader";
import { RequireModule } from "@/components/session/RequireModule";

export default function EditarExtraccionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireModule modules="muestras">
      <RecordLoader url={`/samples/extraction/${id}`}>{(item) => <ExtractionForm key={String(item.id)} item={item} />}</RecordLoader>
    </RequireModule>
  );
}
