"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Dialog } from "@/components/ui/Overlay";
import { API_BASE_URL, getJsonAuth, sendJsonAuth } from "@/lib/client/api";
import { useResource } from "@/lib/client/store";

/*
 * Firmante ligado a una cuenta (Fase 5): quien recibio, proceso, superviso,
 * extrajo, limpio o analizo se elige de las cuentas activas. Por omision es la
 * persona de la sesion; si se elige a otra, esa persona confirma con su
 * contrasena (POST /api/firmas/confirmar) y el formato envia el token de firma
 * de un solo uso junto con su usuario_id. El servidor pone nombre y cargo.
 */
export interface Cuenta {
  id: number;
  nombre: string;
  email: string;
  cargo: string | null;
}

export interface FirmanteState {
  usuario_id: number | null;
  token_firma?: string | null;
}

export function useCuentasActivas(): Cuenta[] {
  const { token } = useSession();
  const resource = useResource<Cuenta[]>(
    "cuentas-activas",
    async () => ((await getJsonAuth(`${API_BASE_URL}/cuentas/activas`, token)).items || []) as Cuenta[],
    { enabled: !!token },
  );
  return resource.data || [];
}

/* Firmantes para el payload: { rol: { usuario_id, token_firma } } (solo los elegidos). */
export function firmantesPayload(map: Record<string, FirmanteState | undefined>): Record<string, { usuario_id: number; token_firma?: string }> {
  const out: Record<string, { usuario_id: number; token_firma?: string }> = {};
  for (const [rol, f] of Object.entries(map)) {
    if (f?.usuario_id) out[rol] = f.token_firma ? { usuario_id: f.usuario_id, token_firma: f.token_firma } : { usuario_id: f.usuario_id };
  }
  return out;
}

/* Estado inicial desde el registro guardado (<rol>_usuario_id). */
export const firmanteDe = (item: Record<string, unknown> | null | undefined, rol: string): FirmanteState => ({ usuario_id: Number(item?.[`${rol}_usuario_id`]) || null });

export function FirmanteSelect({
  id,
  title,
  value,
  onChange,
  nombre,
  disabled = false,
  porOmisionSesion = true,
}: {
  id: string;
  title: string;
  value: FirmanteState;
  /* Nueva seleccion, con el nombre y cargo de la cuenta (para el campo visible). */
  onChange: (value: FirmanteState, cuenta: Cuenta | null) => void;
  /* Nombre guardado (registros anteriores sin cuenta). */
  nombre?: string;
  disabled?: boolean;
  porOmisionSesion?: boolean;
}) {
  const { token, user } = useSession();
  const cuentas = useCuentasActivas();
  const yo = Number(user?.id) || 0;
  const [pendiente, setPendiente] = useState<Cuenta | null>(null);
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Por omision firma la persona de la sesion (solo en formatos nuevos o sin firmante).
  useEffect(() => {
    if (disabled || !porOmisionSesion || value.usuario_id || (nombre && nombre.trim()) || !yo || !cuentas.length) return;
    const propia = cuentas.find((c) => c.id === yo) || null;
    if (propia) onChange({ usuario_id: yo }, propia);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuentas.length, yo, disabled]);

  const actual = cuentas.find((c) => c.id === value.usuario_id) || null;
  const elegir = (idTexto: string) => {
    const cuenta = cuentas.find((c) => String(c.id) === idTexto) || null;
    if (!cuenta) {
      onChange({ usuario_id: null }, null);
      return;
    }
    if (cuenta.id === yo) {
      onChange({ usuario_id: yo }, cuenta);
      return;
    }
    // Otra persona: confirma con su contrasena antes de quedar como firmante.
    setPassword("");
    setError(null);
    setPendiente(cuenta);
  };

  const confirmar = async () => {
    if (!pendiente) return;
    if (!password) {
      setError("Escribe la contraseña de quien firma");
      return;
    }
    setEnviando(true);
    try {
      const data = await sendJsonAuth("POST", `${API_BASE_URL}/firmas/confirmar`, token, { usuario_id: pendiente.id, password });
      onChange({ usuario_id: pendiente.id, token_firma: String(data.token_firma || "") }, pendiente);
      toast.success(`Firma de ${pendiente.nombre} confirmada`);
      setPendiente(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo confirmar la firma");
    } finally {
      setPassword("");
      setEnviando(false);
    }
  };

  const confirmada = !!value.usuario_id && (value.usuario_id === yo || !!value.token_firma);
  return (
    <div className="flex flex-col gap-1.5">
      <Select id={id} value={value.usuario_id ? String(value.usuario_id) : ""} disabled={disabled} onChange={(event) => elegir(event.target.value)} aria-label={`${title}: cuenta`}>
        <option value="">{nombre && !value.usuario_id ? `${nombre} (sin cuenta ligada)` : "Seleccionar cuenta"}</option>
        {cuentas.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </Select>
      {actual ? (
        <p className="text-[12.5px] text-ink-3" data-firmante={value.usuario_id}>
          {actual.cargo ? `Cargo: ${actual.cargo}` : actual.email}
          {!disabled && actual.id !== yo ? (confirmada ? " · firma confirmada con su contraseña" : "") : ""}
        </p>
      ) : null}
      <Dialog
        open={!!pendiente}
        onOpenChange={(open) => {
          if (!open) setPendiente(null);
        }}
        title={`Confirmar firma de ${pendiente?.nombre || ""}`}
        description="Quien firma debe escribir su propia contraseña. Así la firma queda ligada a su cuenta."
        size="sm"
        footer={
          <>
            {error ? <p className="mr-auto text-[13px] text-danger">{error}</p> : null}
            <Button variant="secondary" onClick={() => setPendiente(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmar} loading={enviando}>
              Confirmar firma
            </Button>
          </>
        }
      >
        <Field label={`Contraseña de ${pendiente?.nombre || "quien firma"}`} htmlFor="firma-password">
          <Input
            id="firma-password"
            type="password"
            autoComplete="off"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void confirmar();
              }
            }}
          />
        </Field>
      </Dialog>
    </div>
  );
}
