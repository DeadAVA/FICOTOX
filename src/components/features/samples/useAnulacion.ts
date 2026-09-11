"use client";

import { toast } from "sonner";
import { useSession } from "@/components/session/SessionProvider";
import { usePrompt } from "@/components/ui/Overlay";
import { API_BASE_URL, sendJsonAuth } from "@/lib/client/api";
import { invalidate } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";

type Stage = "reception" | "processing" | "extraction" | "analysis";

const LABEL: Record<Stage, string> = { reception: "recepción", processing: "procesamiento", extraction: "extracción", analysis: "análisis" };

/*
 * Anular / restaurar un registro tecnico con motivo obligatorio. Los
 * registros nunca se eliminan: quedan marcados y en la bitacora.
 */
export function useAnulacion(stage: Stage, folioOf: (item: ApiRecord) => string) {
  const prompt = usePrompt();
  const { token } = useSession();

  const anular = async (item: ApiRecord): Promise<boolean> => {
    const motivo = await prompt({
      title: `Anular ${LABEL[stage]} ${folioOf(item)}`,
      description: stage === "reception" ? "El registro se conserva marcado como anulado. No se puede anular si tiene procesamientos vigentes." : "El registro se conserva marcado como anulado y el inventario que descontó se repone.",
      confirmLabel: "Anular",
      tone: "danger",
    });
    if (!motivo) return false;
    try {
      const data = await sendJsonAuth("POST", `${API_BASE_URL}/samples/${stage}/${item.id}/anular`, token, { motivo });
      toast.success(String(data.message || "Registro anulado"));
      invalidate("muestras", "movimientos", "reactivos", "consumibles", "dashboard");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo anular");
      return false;
    }
  };

  const restaurar = async (item: ApiRecord): Promise<boolean> => {
    const motivo = await prompt({ title: `Restaurar ${LABEL[stage]} ${folioOf(item)}`, description: "El registro vuelve a su estado anterior. El inventario no se descuenta de nuevo automáticamente.", confirmLabel: "Restaurar" });
    if (!motivo) return false;
    try {
      const data = await sendJsonAuth("POST", `${API_BASE_URL}/samples/${stage}/${item.id}/restaurar`, token, { motivo });
      toast.success(String(data.message || "Registro restaurado"));
      invalidate("muestras", "dashboard");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo restaurar");
      return false;
    }
  };

  return { anular, restaurar };
}
