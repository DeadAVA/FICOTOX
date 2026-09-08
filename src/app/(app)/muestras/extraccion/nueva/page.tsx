"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ExtractionForm } from "@/components/features/samples/ExtractionForm";
import { RequireModule } from "@/components/session/RequireModule";
import { Skeleton } from "@/components/ui/Primitives";

function NuevaExtraccion() {
  const params = useSearchParams();
  const procesamiento = Number.parseInt(params.get("procesamiento") || "", 10) || null;
  return <ExtractionForm key={procesamiento ?? "nueva"} item={null} prefillProcessingId={procesamiento} />;
}

export default function NuevaExtraccionPage() {
  return (
    <RequireModule modules="muestras">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <NuevaExtraccion />
      </Suspense>
    </RequireModule>
  );
}
