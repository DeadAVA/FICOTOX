"use client";

import type { ReactNode } from "react";
import { PageBody } from "@/components/shell/AppShell";
import { useSession } from "@/components/session/SessionProvider";
import { LinkTabs, PageHeader } from "@/components/ui/PageHeader";
import { INVENTORY_TABS } from "@/lib/client/nav";

export default function InventarioLayout({ children }: { children: ReactNode }) {
  const { can } = useSession();
  const tabs = INVENTORY_TABS.filter((tab) => can(tab.module)).map((tab) => ({ href: tab.href, label: tab.label }));
  return (
    <PageBody>
      <PageHeader title="Inventario" description="Reactivos, consumibles, equipos y su mantenimiento." />
      <LinkTabs items={tabs} />
      {children}
    </PageBody>
  );
}
