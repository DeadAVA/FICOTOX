"use client";

/*
 * Aviso al abrir un formato (Fase 4): si falta una autorizacion FX-THF-AP para
 * lo que el formato pide, se dice antes de capturar. El servidor lo valida al guardar.
 */
import { Callout } from "@/components/features/samples/FormLayout";
import { useAutorizaciones } from "@/lib/client/useAutorizaciones";
import type { Requisito } from "@/lib/shared/autorizaciones";

export function AvisoAutorizacion({ requisitos, className, accion = "guardar este formato" }: { requisitos: Requisito[]; className?: string; accion?: string }) {
  const { falta } = useAutorizaciones();
  const mensaje = falta(requisitos);
  if (!mensaje) return null;
  return (
    <div className={className} data-aviso-autorizacion>
      <Callout tone="warning" title="Falta una autorización (FX-THF-AP)">
        {mensaje}. No podrás {accion} hasta que la coordinación la registre en tu ficha (Administración › Usuarios › Autorizaciones).
      </Callout>
    </div>
  );
}
