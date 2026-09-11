"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Dialog } from "@/components/ui/Overlay";
import { SignaturePad } from "./SignaturePad";

/*
 * Dialogo de firma para revisar, aprobar o autorizar: deja constancia con
 * nombre (el de la sesion), cargo opcional, firma y observaciones.
 */
export function SignDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  withCargo = true,
  withObservaciones = false,
  requireSignature = false,
  loading = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  withCargo?: boolean;
  withObservaciones?: boolean;
  requireSignature?: boolean;
  loading?: boolean;
  onConfirm: (data: { firma: string; cargo: string; observaciones: string }) => Promise<void> | void;
}) {
  const [firma, setFirma] = useState("");
  const [cargo, setCargo] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (requireSignature && !firma) {
      setError("La firma es obligatoria");
      return;
    }
    setError(null);
    await onConfirm({ firma, cargo: cargo.trim(), observaciones: observaciones.trim() });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          {error ? <p className="mr-auto text-[13px] text-danger">{error}</p> : null}
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {withCargo ? (
          <Field label="Cargo" htmlFor="sign-cargo" hint="Aparece junto a tu nombre en el registro y en el informe.">
            <Input id="sign-cargo" maxLength={120} value={cargo} onChange={(event) => setCargo(event.target.value)} placeholder="Ej. Coordinadora técnica" />
          </Field>
        ) : null}
        {withObservaciones ? (
          <Field label="Observaciones" htmlFor="sign-obs">
            <Textarea id="sign-obs" rows={3} value={observaciones} onChange={(event) => setObservaciones(event.target.value)} />
          </Field>
        ) : null}
        <Field label={requireSignature ? "Firma" : "Firma (opcional)"}>
          <SignaturePad value={firma} onChange={setFirma} label={`Firma: ${title}`} />
        </Field>
      </div>
    </Dialog>
  );
}
