"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PageBody } from "@/components/shell/AppShell";
import { LinkTabs, PageHeader } from "@/components/ui/PageHeader";
import { SAMPLE_TABS } from "@/lib/client/nav";

/*
 * Las listas comparten cabecera (titulo de la etapa actual) y el control
 * segmentado de etapas; los formatos (nueva/[id]) van a pantalla completa.
 */
const STAGE_META: Record<string, { title: string; description: string }> = {
  "/muestras/recepcion": { title: "Recepción de muestras", description: "Primer paso del flujo: qué llegó, en qué condiciones y si se acepta (FX-TCF-GMR)." },
  "/muestras/procesamiento": { title: "Procesamiento", description: "Preparación de las muestras aceptadas antes de la extracción." },
  "/muestras/extraccion": { title: "Extracción", description: "Extracción de toxinas a partir de la molienda, con los equipos y reactivos usados. Formatos disponibles: ASP y DSP; PSP, pigmentos y sedimentos, próximamente." },
  "/muestras/analisis": { title: "Análisis", description: "Resultados por muestra, controles de calidad, revisión y aprobación." },
};

export default function MuestrasLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isForm = /\/muestras\/(recepcion|procesamiento|extraccion|analisis)\/(nueva|nuevo|\d+)/.test(pathname);
  if (isForm) return <>{children}</>;
  const meta = Object.entries(STAGE_META).find(([href]) => pathname === href || pathname.startsWith(`${href}/`))?.[1] || { title: "Muestras", description: "Recepción, procesamiento, extracción y análisis." };
  return (
    <PageBody>
      <PageHeader title={meta.title} description={meta.description} />
      <LinkTabs className="lg:hidden" items={SAMPLE_TABS.map((tab) => ({ href: tab.href, label: tab.label }))} />
      {children}
    </PageBody>
  );
}
