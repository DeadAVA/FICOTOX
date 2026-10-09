"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session/SessionProvider";
import { SAMPLE_TABS } from "@/lib/client/nav";

/* Lleva a la primera etapa que la persona puede ver (recepción: muestras; las demás: ensayos). */
export default function MuestrasIndexPage() {
  const router = useRouter();
  const { can } = useSession();
  const destino = SAMPLE_TABS.find((tab) => !tab.module || can(tab.module))?.href || "/muestras/recepcion";
  useEffect(() => {
    router.replace(destino);
  }, [router, destino]);
  return null;
}
