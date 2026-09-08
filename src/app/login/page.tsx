"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeSlash, WindowsLogo } from "@phosphor-icons/react";
import { BrandLockup } from "@/components/shell/Brand";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { loginWithMicrosoft } from "@/lib/client/msal";
import { firstAllowedRoute } from "@/lib/client/nav";

/*
 * Acceso. Panel izquierdo: el bloom (floracion algal) como unico momento
 * visual de gran escala del producto. Derecha: formulario sobrio.
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

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-deep text-white lg:flex lg:flex-col lg:justify-between lg:p-12" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_10%_0%,#0E4A55_0%,#07202B_55%,#04141b_100%)]" />
        <div className="bloom-field" />
        <div className="grain" />
        <div className="relative">
          <BrandLockup inverted />
        </div>
        <div className="relative max-w-xl">
          <h1 className="display text-[54px] leading-[1.02] text-white xl:text-[64px]">
            El registro del laboratorio,
            <br />
            <em className="text-brand-bright">de la muestra al resultado.</em>
          </h1>
          <p className="mt-6 max-w-md text-[16px] leading-relaxed text-white/70">
            Recepción, procesamiento, extracción e inventario con trazabilidad completa para el análisis de ficotoxinas marinas.
          </p>
        </div>
        <div className="relative flex items-center gap-3 text-[13px] text-white/55">
          <span>LN-FICOTOX</span>
          <span className="h-1 w-1 rounded-full bg-white/30" />
          <span>CICESE · Ensenada, B.C.</span>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-[400px] animate-rise-in">
          <div className="mb-10 lg:hidden">
            <BrandLockup />
          </div>
          <h2 className="text-[26px] font-semibold tracking-tight text-ink">Iniciar sesión</h2>
          <p className="mt-1.5 text-[14px] text-ink-3">Usa tu correo institucional para entrar al sistema.</p>

          {manualEnabled ? (
            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" noValidate>
              <Field label="Correo electrónico" htmlFor="login-email" required>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="nombre@cicese.mx"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoFocus
                  className="h-11"
                />
              </Field>
              <Field label="Contraseña" htmlFor="login-password" required>
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="h-11"
                  trailing={
                    <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} className="rounded-full p-1 text-ink-3 hover:bg-surface-2 hover:text-ink">
                      {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
              </Field>
              {error ? (
                <p role="alert" className="rounded-control border border-danger/30 bg-danger-soft px-3 py-2 text-[13px] text-[#a33731]">
                  {error}
                </p>
              ) : null}
              <Button type="submit" size="lg" block loading={submitting} iconRight={<ArrowRight size={16} weight="bold" />}>
                Entrar
              </Button>
            </form>
          ) : null}

          {microsoftEnabled ? (
            <div className={manualEnabled ? "mt-6" : "mt-8"}>
              {manualEnabled ? (
                <div className="mb-6 flex items-center gap-3 text-[12px] text-ink-4">
                  <span className="h-px flex-1 bg-line" />
                  o
                  <span className="h-px flex-1 bg-line" />
                </div>
              ) : null}
              <Button type="button" variant="secondary" size="lg" block loading={msBusy} onClick={handleMicrosoft} icon={<WindowsLogo size={18} weight="fill" />}>
                Continuar con Microsoft
              </Button>
              {!manualEnabled && error ? (
                <p role="alert" className="mt-4 rounded-control border border-danger/30 bg-danger-soft px-3 py-2 text-[13px] text-[#a33731]">
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}

          {!manualEnabled && !microsoftEnabled ? <p className="mt-8 text-[13.5px] text-ink-3">El acceso está desactivado. Contacta al administrador del sistema.</p> : null}

          <p className="mt-10 text-[12.5px] text-ink-4">¿Sin acceso? Solicítalo a la coordinación del laboratorio.</p>
        </div>
      </section>
    </main>
  );
}
