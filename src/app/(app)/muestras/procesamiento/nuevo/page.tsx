"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ProcessingForm } from "@/components/features/samples/ProcessingForm";
import { RequireModule } from "@/components/session/RequireModule";
import { Skeleton } from "@/components/ui/Primitives";

function NuevoProcesamiento() {
  const params = useSearchParams();
  const recepcion = Number.parseInt(params.get("recepcion") || "", 10) || null;
  return <ProcessingForm key={recepcion ?? "nuevo"} item={null} prefillReceptionId={recepcion} />;
}

export default function NuevoProcesamientoPage() {
  return (
    <RequireModule modules="muestras">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <NuevoProcesamiento />
      </Suspense>
    </RequireModule>
  );
}
