"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Popover as RadixPopover } from "radix-ui";
import { Bell } from "@phosphor-icons/react";
import { useSession } from "@/components/session/SessionProvider";
import { cn } from "@/components/ui/cn";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";

/*
 * Campana de notificaciones (Fase 9): lo que aplica a la persona segun sus
 * permisos y asignaciones, calculado al vuelo en GET /api/notificaciones.
 * Se recarga cada minuto y al volver a la pestana.
 */
interface Notificacion {
  tipo: string;
  titulo: string;
  detalle: string;
  href: string;
  tono: "danger" | "warning" | "info";
}

const PUNTO: Record<Notificacion["tono"], string> = { danger: "bg-danger", warning: "bg-warning", info: "bg-brand" };

export function Campana({ compacta = false }: { compacta?: boolean }) {
  const { token } = useSession();
  const [items, setItems] = useState<Notificacion[]>([]);
  const [abierta, setAbierta] = useState(false);

  const cargar = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getJsonAuth(`${API_BASE_URL}/notificaciones`, token);
      setItems((data.items as Notificacion[]) || []);
    } catch {
      /* sin conexion: se conserva la lista anterior */
    }
  }, [token]);

  useEffect(() => {
    const primera = window.setTimeout(cargar, 0);
    const intervalo = window.setInterval(cargar, 60_000);
    const alVolver = () => {
      if (document.visibilityState === "visible") cargar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.clearTimeout(primera);
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [cargar]);

  return (
    <RadixPopover.Root
      open={abierta}
      onOpenChange={(open) => {
        setAbierta(open);
        if (open) cargar();
      }}
    >
      <RadixPopover.Trigger asChild>
        <button type="button" aria-label="Notificaciones" className={cn("press relative inline-flex items-center justify-center text-ink-3 hover:bg-surface-3 hover:text-ink", compacta ? "h-9 w-full rounded-[9px]" : "h-8 w-8 rounded-[8px]")}>
          <Bell size={compacta ? 18 : 17} />
          {items.length ? (
            <span data-campana-contador className="tnum absolute -right-0.5 -top-0.5 min-w-[16px] rounded-full bg-danger px-1 text-center text-[10px] font-semibold leading-[16px] text-on-accent">
              {items.length > 99 ? "99+" : items.length}
            </span>
          ) : null}
        </button>
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content data-campana-panel align="start" side={compacta ? "right" : "bottom"} sideOffset={8} collisionPadding={12} className="material z-50 flex max-h-[70vh] w-[340px] flex-col rounded-[16px] shadow-panel outline-none data-[state=open]:animate-materialize data-[state=closed]:animate-dematerialize">
          <p className="border-b border-line px-4 py-3 text-[14px] font-semibold text-ink">Notificaciones</p>
          {items.length ? (
            <ul className="scroll-thin flex-1 overflow-y-auto py-1">
              {items.map((item, index) => (
                <li key={`${item.tipo}-${index}`}>
                  <Link href={item.href} onClick={() => setAbierta(false)} className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-surface-3">
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", PUNTO[item.tono] || "bg-brand")} aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-medium text-ink">{item.titulo}</span>
                      {item.detalle ? <span className="block truncate text-[12.5px] text-ink-3">{item.detalle}</span> : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-[13px] text-ink-3">Sin notificaciones</p>
          )}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
