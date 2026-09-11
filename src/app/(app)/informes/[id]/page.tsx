"use client";

import { use } from "react";
import { InformeForm } from "@/components/features/informes/InformeForm";
import { RecordLoader } from "@/components/features/samples/RecordLoader";
import { RequireModule } from "@/components/session/RequireModule";

export default function InformePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireModule modules="informes">
      <RecordLoader url={`/informes/${id}`} keys={["informes"]}>{(item) => <InformeForm key={`${item.id}-${item.estado}-${item.actualizado_en}`} item={item} />}</RecordLoader>
    </RequireModule>
  );
}
