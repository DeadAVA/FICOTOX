"use client";

import { ReceptionForm } from "@/components/features/samples/ReceptionForm";
import { RequireModule } from "@/components/session/RequireModule";

export default function NuevaRecepcionPage() {
  return (
    <RequireModule modules="muestras">
      <ReceptionForm item={null} />
    </RequireModule>
  );
}
