"use client";

import type { ReactNode } from "react";
import { LockKey } from "@phosphor-icons/react";
import { EmptyState } from "@/components/ui/Primitives";
import { useSession } from "./SessionProvider";

/* Muestra el contenido solo si el rol puede leer alguno de los modulos. */
export function RequireModule({ modules, children }: { modules: string | string[]; children: ReactNode }) {
  const { can } = useSession();
  const list = Array.isArray(modules) ? modules : [modules];
  if (!list.some((moduleKey) => can(moduleKey))) {
    return (
      <EmptyState
        icon={<LockKey size={20} />}
        title="Sin acceso a esta sección"
        description="Tu rol no tiene permiso de lectura aquí. Pide a la coordinación que ajuste tus permisos."
      />
    );
  }
  return <>{children}</>;
}
