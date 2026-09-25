"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { BrandMark } from "@/components/shell/Brand";
import { useSession } from "@/components/session/SessionProvider";
import { SinPermisos } from "@/components/session/SinPermisos";
import { CambioPasswordObligatorio } from "@/components/session/CambiarPassword";
import { SesionInactiva } from "@/components/session/SesionInactiva";

/*
 * Guardia de sesion: mientras se valida el token se muestra la marca;
 * sin sesion se redirige a /login; con sesion se monta el shell. Una persona
 * sin roles vigentes solo ve el aviso "Sin permisos asignados" (Fase 1). Fase 2:
 * cambio de contrasena obligatorio y cierre por inactividad (SesionInactiva).
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status, roles, user, locked } = useSession();

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  // Bloqueada por inactividad: la pagina sigue montada bajo la pantalla de bloqueo.
  if (status !== "authenticated" && !locked) {
    return (
      <div className="flex min-h-dvh items-center justify-center" aria-busy="true" aria-label="Cargando sesión">
        <div className="animate-pulse">
          <BrandMark size={40} />
        </div>
      </div>
    );
  }

  // Contrasena restablecida por la administracion: primero hay que cambiarla (Fase 2).
  if (user?.debe_cambiar_password) return <CambioPasswordObligatorio />;

  if (!roles.length) return <SinPermisos />;

  return (
    <>
      <AppShell>{children}</AppShell>
      <SesionInactiva />
    </>
  );
}
