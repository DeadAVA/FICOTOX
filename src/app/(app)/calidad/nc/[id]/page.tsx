"use client";

import { use } from "react";
import { NcForm } from "@/components/features/calidad/NcForm";
import { RecordLoader } from "@/components/features/samples/RecordLoader";
import { RequireModule } from "@/components/session/RequireModule";

export default function NoConformidadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireModule modules="calidad" ctx={{ objeto: "nc" }}>
      <RecordLoader url={`/calidad/nc/${id}`} keys={["calidad"]}>{(item) => <NcForm key={`${item.id}-${item.estado}-${item.reaperturas}`} item={item} />}</RecordLoader>
    </RequireModule>
  );
}
