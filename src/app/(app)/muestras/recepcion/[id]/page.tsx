"use client";

import { use } from "react";
import { ReceptionForm } from "@/components/features/samples/ReceptionForm";
import { RecordLoader } from "@/components/features/samples/RecordLoader";
import { RequireModule } from "@/components/session/RequireModule";

export default function EditarRecepcionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireModule modules="muestras">
      <RecordLoader url={`/samples/reception/${id}`}>{(item) => <ReceptionForm key={String(item.id)} item={item} />}</RecordLoader>
    </RequireModule>
  );
}
