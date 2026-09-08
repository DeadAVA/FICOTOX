"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PageBody } from "@/components/shell/AppShell";
import { LinkTabs, PageHeader } from "@/components/ui/PageHeader";
import { SAMPLE_TABS } from "@/lib/client/nav";

/* Las listas comparten cabecera y pestañas; los formatos (nueva/[id]) van a pantalla completa. */
export default function MuestrasLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isForm = /\/muestras\/(recepcion|procesamiento|extraccion)\/(nueva|nuevo|\d+)/.test(pathname);
  if (isForm) return <>{children}</>;
  return (
    <PageBody>
      <PageHeader title="Muestras" description="Recepción, procesamiento y extracción con trazabilidad e inventario." />
      <LinkTabs items={SAMPLE_TABS.map((tab) => ({ href: tab.href, label: tab.label }))} />
      {children}
    </PageBody>
  );
}
