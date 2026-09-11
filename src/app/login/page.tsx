"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeSlash, WindowsLogo } from "@phosphor-icons/react";
import { BrandMark } from "@/components/shell/Brand";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { loginWithMicrosoft } from "@/lib/client/msal";
import { firstAllowedRoute } from "@/lib/client/nav";

/*
 * Acceso. Blanco, una sola columna y sin tarjeta: la marca animada, el nombre
 * del sistema y los dos campos. El fondo lleva dos luces océano casi
 * imperceptibles a la deriva; los elementos entran escalonados.
 */

export default function LoginPage() {
  const router = useRouter();
  const { status, permissions, authConfig, loginWithEmail, acceptLogin } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msBusy, setMsBusy] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(firstAllowedRoute(permissions) || "/");
    }
  }, [status, permissions, router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginWithEmail(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
      setSubmitting(false);
    }
  };

  const handleMicrosoft = async () => {
    setError(null);
    setMsBusy(true);
    try {
      const data = await loginWithMicrosoft(authConfig);
      if (data) acceptLogin(data);
      else setMsBusy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión con Microsoft");
      setMsBusy(false);
    }
  };

  const manualEnabled = authConfig.manualLoginEnabled !== false;
  const microsoftEnabled = !!authConfig.microsoft?.enabled;
  const fieldClass = "h-12 rounded-[12px] border-line bg-white text-[15px] shadow-[0_1px_2px_rgba(16,32,43,0.04)] hover:border-line-strong focus:bg-white";

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#fbfbfd] px-6 py-12 text-ink">
      <div className="light-field" aria-hidden="true" />

      <section className="stagger relative flex w-full max-w-[380px] flex-col items-center" aria-labelledby="login-title">
        <BrandMark size={88} animated className="drop-shadow-[0_18px_30px_rgba(10,84,104,0.22)]" />

        <h1 id="login-title" className="mt-7 text-[30px] font-bold tracking-[-0.035em] text-ink">
          FICOTOX
        </h1>
        <p className="mt-1.5 text-center text-[15px] text-ink-2">Sistema Integrado de Gestión de Laboratorio</p>
        <p className="eyebrow mt-3 text-ink-3">LN-FICOTOX · CICESE</p>

        {manualEnabled ? (
          <form onSubmit={handleSubmit} className="mt-10 flex w-full flex-col gap-4" noValidate>
            <Field label="Correo institucional" htmlFor="login-email">
              <Input id="login-email" type="email" autoComplete="email" inputMode="email" placeholder="nombre@cicese.mx" value={email} onChange={(event) => setEmail(event.target.value)} required autoFocus className={fieldClass} />
            </Field>
            <Field label="Contraseña" htmlFor="login-password">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className={fieldClass}
                trailing={
                  <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} className="press rounded-full p-1.5 text-ink-3 hover:bg-surface-3 hover:text-ink">
                    {showPassword ? <EyeSlash size={17} /> : <Eye size={17} />}
                  </button>
                }
              />
            </Field>
            {error ? (
              <p role="alert" className="rounded-[10px] bg-danger-soft px-3 py-2 text-[13px] text-danger-text">
                {error}
              </p>
            ) : null}
            <Button type="submit" size="lg" block loading={submitting} iconRight={<ArrowRight size={16} weight="bold" />} className="mt-2 h-12 rounded-[12px] text-[15px] shadow-[0_8px_20px_-8px_rgba(15,122,149,0.55)]">
              Entrar
            </Button>
          </form>
        ) : null}

        {microsoftEnabled ? (
          <div className={`w-full ${manualEnabled ? "mt-5" : "mt-10"}`}>
            {manualEnabled ? (
              <div className="mb-5 flex items-center gap-3 text-[12px] text-ink-4">
                <span className="h-px flex-1 bg-line" />
                o
                <span className="h-px flex-1 bg-line" />
              </div>
            ) : null}
            <Button type="button" variant="secondary" size="lg" block loading={msBusy} onClick={handleMicrosoft} icon={<WindowsLogo size={18} weight="fill" />} className="h-12 rounded-[12px] border border-line bg-white shadow-none hover:bg-surface-2">
              Continuar con Microsoft
            </Button>
            {!manualEnabled && error ? (
              <p role="alert" className="mt-4 rounded-[10px] bg-danger-soft px-3 py-2 text-[13px] text-danger-text">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}

        {!manualEnabled && !microsoftEnabled ? <p className="mt-10 text-center text-[13.5px] text-ink-3">El acceso está desactivado. Contacta a la administración del sistema.</p> : null}
      </section>

      <footer className="absolute bottom-6 left-0 right-0 px-6 text-center text-[12px] leading-relaxed text-ink-4">
        Laboratorio Nacional de Análisis, Monitoreo e Investigación sobre Ficotoxinas
        <br />
        Centro de Investigación Científica y de Educación Superior de Ensenada, B.C.
      </footer>
    </main>
  );
}
