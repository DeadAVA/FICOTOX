"use client";

import type { ReactNode } from "react";
import { LockKey } from "@phosphor-icons/react";
import { EmptyState } from "@/components/ui/Primitives";
import type { Modulo } from "@/lib/shared/permisos";
import { useSession } from "./SessionProvider";

/* Muestra el contenido solo si la persona puede ver (V) alguno de los modulos. */
export function RequireModule({ modules, children }: { modules: Modulo | Modulo[]; children: ReactNode }) {
  const { can } = useSession();
  const list = Array.isArray(modules) ? modules : [modules];
  if (!list.some((modulo) => can(modulo, "V"))) {
    return (
      <EmptyState
        icon={<LockKey size={20} />}
        title="Sin acceso a esta sección"
        description="Tus roles no tienen permiso para ver esta sección. Pide a la administración que revise tus roles."
      />
    );
  }
  return <>{children}</>;
}
