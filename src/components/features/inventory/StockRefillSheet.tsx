"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Overlay";
import { API_BASE_URL, sendJsonAuth } from "@/lib/client/api";
import { parseNumberOrNull } from "@/lib/client/format";
import { invalidate } from "@/lib/client/store";

export interface StockRefillTarget {
  type: "reactivo" | "consumible";
  id: number;
  name: string;
  unit?: string;
}

export function StockRefillSheet({ open, target, onClose }: { open: boolean; target: StockRefillTarget | null; onClose: () => void }) {
  const { token } = useSession();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("Relleno manual de stock");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isReactivo = target?.type === "reactivo";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!target) return;
    const value = parseNumberOrNull(amount);
    if (value === null || value <= 0) {
      setError("Captura una cantidad mayor que cero");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = { cantidad: isReactivo ? value : Math.round(value), motivo: reason.trim() || "Relleno manual de stock" };
      const url = isReactivo ? `${API_BASE_URL}/inventory/reactivos/${target.id}/refill` : `${API_BASE_URL}/consumables/${target.id}/refill`;
      await sendJsonAuth("POST", url, token, payload);
      toast.success(isReactivo ? "Stock del reactivo actualizado" : "Stock del consumible actualizado");
      invalidate(isReactivo ? "reactivos" : "consumibles", "movimientos", "dashboard");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo rellenar el stock");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => !value && onClose()}
      title={isReactivo ? "Rellenar reactivo" : "Rellenar consumible"}
      description={target?.name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="stock-refill-form" loading={submitting}>
            Aplicar relleno
          </Button>
        </>
      }
    >
      <form id="stock-refill-form" onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <Field label={isReactivo ? `Cantidad a sumar${target?.unit ? ` (${target.unit})` : ""}` : "Piezas a sumar"} htmlFor="refill-amount" required error={error}>
          <Input
            id="refill-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step={isReactivo ? "0.0001" : "1"}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder={isReactivo ? "Ejemplo: 250" : "Ejemplo: 12"}
            autoFocus
            invalid={!!error}
          />
        </Field>
        <Field label="Motivo" htmlFor="refill-reason" hint="Queda registrado en el historial de movimientos.">
          <Input id="refill-reason" maxLength={180} value={reason} onChange={(event) => setReason(event.target.value)} />
        </Field>
      </form>
    </Sheet>
  );
}
