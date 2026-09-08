"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { BrandMark } from "@/components/shell/Brand";
import { useSession } from "@/components/session/SessionProvider";

/*
 * Guardia de sesion: mientras se valida el token se muestra la marca;
 * sin sesion se redirige a /login; con sesion se monta el shell.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-dvh items-center justify-center" aria-busy="true" aria-label="Cargando sesión">
        <div className="animate-pulse">
          <BrandMark size={40} />
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
