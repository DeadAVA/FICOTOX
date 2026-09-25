"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { LockKey } from "@phosphor-icons/react";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Dialog } from "@/components/ui/Overlay";
import { registrarReautenticador, type CredencialReauth } from "@/lib/client/api";

/*
 * Confirmar identidad (Fase 2). Las acciones criticas piden de nuevo la
 * contrasena. Los dialogos de confirmacion (motivo, firma) la piden en el mismo
 * dialogo con <CampoIdentidad>; si una accion critica llega sin ella, este
 * proveedor la pide en un dialogo propio, sin salir del formulario.
 */

const ETIQUETA_ACCION: Record<string, string> = {
  A: "aprobar o autorizar",
  AN: "anular, cancelar o dar de baja",
  G: "reactivar",
  visto_bueno: "dar el visto bueno",
  roles: "asignar o revocar roles",
  vigencia: "cambiar la vigencia o el supervisor de una cuenta",
  desbloquear: "desbloquear una cuenta",
  password: "restablecer una contraseña",
  baja: "dar de baja una cuenta",
  reactivar: "reactivar una cuenta",
  permisos: "cambiar los permisos de un rol",
};

export function describirAccion(accion: string): string {
  const [, clave] = accion.split(":");
  return ETIQUETA_ACCION[clave] || "realizar esta acción";
}

/*
 * Campos de confirmacion dentro de un dialogo critico: "Actuar como" (si la
 * persona tiene varios roles y se pasan `cargo`/`onCargo`) y "Tu contraseña".
 * El cargo vacio significa "automatico": el predeterminado o, si no aplica, se
 * pregunta. El servidor valida que el cargo elegido otorgue la accion.
 */
export function CampoIdentidad({ value, onChange, error, id = "confirmar-identidad", cargo, onCargo }: { value: string; onChange: (value: string) => void; error?: string | null; id?: string; cargo?: string; onCargo?: (value: string) => void }) {
  const selector = onCargo ? <CampoCargo value={cargo || ""} onChange={onCargo} id={`${id}-cargo`} /> : null;
  return (
    <div className="flex flex-col gap-3">
      {selector}
      <Field label="Tu contraseña" htmlFor={id} required error={error || undefined} hint={error ? undefined : "Confirma tu identidad: esta acción queda firmada con tu usuario."}>
        <Input id={id} type="password" autoComplete="current-password" value={value} onChange={(event) => onChange(event.target.value)} leading={<LockKey size={16} />} />
      </Field>
    </div>
  );
}

/* Solo "Actuar como" (acciones que firman sin reautenticacion, p. ej. revisar). */
export function CampoCargo({ value, onChange, id = "actuar-como" }: { value: string; onChange: (value: string) => void; id?: string }) {
  const { user, roles } = useSession();
  if (roles.length < 2) return null;
  return (
    <Field label="Actuar como" htmlFor={id} hint="Cargo con el que firmas esta acción.">
      <Select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{user?.cargo_predeterminado ? `Predeterminado (${roles.find((r) => r.id === user.cargo_predeterminado)?.nombre || "mi cargo"})` : "Preguntar si hace falta"}</option>
        {roles.map((rol) => (
          <option key={rol.id} value={String(rol.id)}>
            {rol.nombre}
          </option>
        ))}
      </Select>
    </Field>
  );
}

/* Toda persona confirma con su contrasena del sistema (Fase 3: sin proveedores externos). */
export function useConfirmaConPassword(): boolean {
  return true;
}

export function ReautenticarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ accion: string; mensaje: string } | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const resolver = useRef<((value: CredencialReauth | null) => void) | null>(null);

  const pedir = useCallback((accion: string, mensaje: string) => {
    return new Promise<CredencialReauth | null>((resolve) => {
      resolver.current = resolve;
      setPassword("");
      setError(null);
      setState({ accion, mensaje });
    });
  }, []);

  useEffect(() => {
    registrarReautenticador(pedir);
    return () => registrarReautenticador(null);
  }, [pedir]);

  const cerrar = (value: CredencialReauth | null) => {
    resolver.current?.(value);
    resolver.current = null;
    setState(null);
  };

  const confirmar = () => {
    if (!password) {
      setError("Escribe tu contraseña");
      return;
    }
    cerrar({ password });
  };

  return (
    <>
      {children}
      <Dialog
        open={!!state}
        onOpenChange={(open) => {
          if (!open) cerrar(null);
        }}
        title="Confirma tu identidad"
        description={`Para ${describirAccion(state?.accion || "")} vuelve a escribir tu contraseña. Lo que capturaste no se pierde.`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => cerrar(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmar}>Confirmar</Button>
          </>
        }
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            confirmar();
          }}
        >
          <Field label="Tu contraseña" htmlFor="reauth-password" required error={error || undefined}>
            <Input id="reauth-password" type="password" autoComplete="current-password" autoFocus value={password} onChange={(event) => setPassword(event.target.value)} leading={<LockKey size={16} />} />
          </Field>
        </form>
      </Dialog>
    </>
  );
}
