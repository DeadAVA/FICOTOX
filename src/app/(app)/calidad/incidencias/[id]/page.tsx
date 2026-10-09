"use client";

import { use } from "react";
import { IncidenciaFicha } from "@/components/features/calidad/IncidenciaFicha";
import { RecordLoader } from "@/components/features/samples/RecordLoader";
import { RequireModule } from "@/components/session/RequireModule";

export default function IncidenciaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireModule modules="calidad" ctx={{ objeto: "incidencia" }}>
      <RecordLoader url={`/calidad/incidencias/${id}`} keys={["calidad"]}>{(item) => <IncidenciaFicha key={`${item.id}-${item.estado}`} item={item} />}</RecordLoader>
    </RequireModule>
  );
}
