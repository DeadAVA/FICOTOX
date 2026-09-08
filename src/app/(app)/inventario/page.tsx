"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session/SessionProvider";
import { EmptyState } from "@/components/ui/Primitives";
import { INVENTORY_TABS } from "@/lib/client/nav";

/* /inventario redirige a la primera pestaña permitida. */
export default function InventarioIndexPage() {
  const router = useRouter();
  const { can } = useSession();
  const first = INVENTORY_TABS.find((tab) => can(tab.module));

  useEffect(() => {
    if (first) router.replace(first.href);
  }, [first, router]);

  if (!first) return <EmptyState title="Sin acceso a inventario" description="Tu rol no tiene permiso de lectura en reactivos, consumibles, equipos ni mantenimiento." />;
  return null;
}
