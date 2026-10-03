"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Overlay";
import { API_BASE_URL, sendJsonAuth } from "@/lib/client/api";
import { parseNumberOrNull } from "@/lib/client/format";
import { invalidate } from "@/lib/client/store";
import { useValidacion, ValidacionAmbito } from "@/components/ui/Validacion";
import { msg } from "@/lib/client/mensajes";

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
  const [submitting, setSubmitting] = useState(false);
  const isReactivo = target?.type === "reactivo";
  const v = useValidacion({
    titulo: "No se pudo rellenar el stock",
    reglas: () => {
      const value = parseNumberOrNull(amount);
      return value === null || value <= 0 ? [{ campo: "refill-amount", mensaje: amount.trim() ? msg.positivo("La cantidad") : msg.indica("la cantidad a sumar") }] : [];
    },
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!target) return;
    if (!v.validar()) return;
    const value = parseNumberOrNull(amount) as number;
    setSubmitting(true);
    try {
      const payload = { cantidad: isReactivo ? value : Math.round(value), motivo: reason.trim() || "Relleno manual de stock" };
      const url = isReactivo ? `${API_BASE_URL}/inventory/reactivos/${target.id}/refill` : `${API_BASE_URL}/consumables/${target.id}/refill`;
      await sendJsonAuth("POST", url, token, payload);
      toast.success(isReactivo ? "Stock del reactivo actualizado" : "Stock del consumible actualizado");
      invalidate(isReactivo ? "reactivos" : "consumibles", "movimientos", "dashboard");
      onClose();
    } catch (err) {
      v.errorServidor(err, { motivo: "refill-reason" });
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
      <ValidacionAmbito v={v}>
      <form id="stock-refill-form" onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <Field label={isReactivo ? `Cantidad a sumar${target?.unit ? ` (${target.unit})` : ""}` : "Piezas a sumar"} htmlFor="refill-amount" required>
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
          />
        </Field>
        <Field label="Motivo" htmlFor="refill-reason" hint="Queda registrado en el historial de movimientos.">
          <Textarea id="refill-reason" rows={2} maxLength={180} value={reason} onChange={(event) => setReason(event.target.value)} />
        </Field>
      </form>
      </ValidacionAmbito>
    </Sheet>
  );
}
