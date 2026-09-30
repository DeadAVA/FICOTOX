"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { BrandMark } from "@/components/shell/Brand";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { API_BASE_URL, sendJsonAuth } from "@/lib/client/api";

/*
 * Cambio de contrasena (Fase 2). Minimo 10 caracteres, distinta del correo y
 * del nombre y de la actual. Cambiarla cierra las demas sesiones; el servidor
 * devuelve una sesion nueva para seguir trabajando aqui.
 */
export function FormCambiarPassword({ onDone, submitLabel = "Cambiar contraseña" }: { onDone?: () => void; submitLabel?: string }) {
  const { token, acceptLogin } = useSession();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (nueva.length < 10) return setError("La contraseña nueva debe tener al menos 10 caracteres");
    if (nueva !== confirmar) return setError("La confirmación no coincide con la contraseña nueva");
    setBusy(true);
    try {
      const data = await sendJsonAuth("POST", `${API_BASE_URL}/auth/password`, token, { actual, nueva });
      acceptLogin(data);
      setActual("");
      setNueva("");
      setConfirmar("");
      toast.success("Contraseña cambiada; tus otras sesiones se cerraron");
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <Field label="Contraseña actual" htmlFor="pwd-actual" required>
        <Input id="pwd-actual" type="password" autoComplete="current-password" value={actual} onChange={(event) => setActual(event.target.value)} />
      </Field>
      <Field label="Contraseña nueva" htmlFor="pwd-nueva" required hint="Al menos 10 caracteres; distinta de tu correo y de tu nombre.">
        <Input id="pwd-nueva" type="password" autoComplete="new-password" value={nueva} onChange={(event) => setNueva(event.target.value)} />
      </Field>
      <Field label="Confirma la contraseña nueva" htmlFor="pwd-confirmar" required>
        <Input id="pwd-confirmar" type="password" autoComplete="new-password" value={confirmar} onChange={(event) => setConfirmar(event.target.value)} />
      </Field>
      {error ? (
        <p role="alert" className="rounded-[10px] bg-danger-soft px-3 py-2 text-[13px] text-danger-text">
          {error}
        </p>
      ) : null}
      <Button type="submit" loading={busy} disabled={!actual || !nueva || !confirmar}>
        {submitLabel}
      </Button>
    </form>
  );
}

/* Pantalla obligatoria tras un restablecimiento: no se entra a nada hasta cambiarla. */
export function CambioPasswordObligatorio() {
  const { user, logout } = useSession();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#fbfbfd] px-6 py-12">
      <section className="w-full max-w-[400px]" aria-labelledby="cambio-titulo">
        <div className="flex flex-col items-center text-center">
          <BrandMark size={52} />
          <h1 id="cambio-titulo" className="mt-5 text-[22px] font-semibold text-ink">
            Cambia tu contraseña
          </h1>
          <p className="mt-1.5 text-[14px] text-ink-2">Entraste con una contraseña temporal (asignada al crear o restablecer tu cuenta). Antes de continuar, {user?.nombre || user?.email}, elige una nueva.</p>
        </div>
        <div className="mt-7">
          <FormCambiarPassword submitLabel="Guardar y continuar" />
        </div>
        <button type="button" onClick={logout} className="mt-5 w-full text-center text-[13px] text-ink-3 hover:underline">
          Salir
        </button>
      </section>
    </main>
  );
}
