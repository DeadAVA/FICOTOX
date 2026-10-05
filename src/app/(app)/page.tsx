"use client";

import { useEffect } from "react";
import { PageBody } from "@/components/shell/AppShell";
import { HomeSearch } from "@/components/shell/HomeSearch";
import { AccesosRapidos, accesosPara } from "@/components/features/inicio/AccesosRapidos";
import { ActividadReciente } from "@/components/features/inicio/ActividadReciente";
import { FlujoLaboratorio } from "@/components/features/inicio/FlujoLaboratorio";
import { ParaTi } from "@/components/features/inicio/ParaTi";
import type { MuestraEnCurso, Pendiente } from "@/components/features/inicio/tipos";
import { useSession } from "@/components/session/SessionProvider";
import { ErrorState } from "@/components/ui/Primitives";
import { cn } from "@/components/ui/cn";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { diaSemana, formatearFechaLarga, formatearHora, hoyLocal } from "@/lib/shared/fechas";

/*
 * Inicio. Fecha, saludo y buscador; debajo, los accesos rapidos del rol; y en
 * dos columnas, el flujo del laboratorio con las muestras en curso y "Para ti"
 * (todo lo pendiente) con la actividad reciente para quien ve la Auditoría.
 * En pantallas angostas: Para ti, flujo, accesos y actividad. Todo con los
 * permisos y alcances de cada persona; se actualiza cada minuto y al volver a
 * la pestaña, sin parpadeos.
 */

interface Datos {
  pendientes: Pendiente[];
  muestras: MuestraEnCurso[] | null;
  total: number;
  actividad: ApiRecord[] | null;
}

function greeting(): string {
  const hour = Number(formatearHora(new Date()).slice(0, 2));
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default function InicioPage() {
  const { token, user, can, alcance } = useSession();
  const veMuestras = can("muestras");
  // Igual que la barra lateral: la Auditoría la ve quien consulta Calidad sin el alcance "solo incidencias".
  const veActividad = can("calidad") && alcance("calidad") !== "incidencias";

  const resource = useResource<Datos>(
    ["dashboard", "movimientos", "mantenimientos", "muestras", "reactivos", "consumibles", "equipos", "informes", "documentos", "calidad", "solicitudes", "usuarios"],
    async () => {
      const vacio: ApiRecord = {};
      const quieto = (url: string, permitido: boolean) => (permitido ? getJsonAuth(url, token).catch(() => null) : Promise.resolve(null));
      const [avisos, flujo, actividad] = await Promise.all([
        getJsonAuth(`${API_BASE_URL}/inicio/avisos`, token).catch(() => vacio),
        quieto(`${API_BASE_URL}/inicio/en-curso`, veMuestras),
        quieto(`${API_BASE_URL}/audit?limit=12&sin_accesos=1`, veActividad),
      ]);
      return {
        pendientes: ((avisos.items || []) as Pendiente[]) || [],
        muestras: flujo ? ((flujo.items || []) as MuestraEnCurso[]) : null,
        total: Number(flujo?.total || 0),
        actividad: actividad ? ((actividad.items || []) as ApiRecord[]) : null,
      };
    },
    { enabled: !!token, deps: [veMuestras, veActividad] },
  );

  // Cada minuto y al volver a la pestaña (como la campana); los datos se reemplazan sin vaciar la pantalla.
  const recargar = resource.reload;
  useEffect(() => {
    if (!token) return;
    const refrescar = () => {
      if (document.visibilityState === "visible") void recargar();
    };
    const timer = window.setInterval(refrescar, 60_000);
    document.addEventListener("visibilitychange", refrescar);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refrescar);
    };
  }, [token, recargar]);

  const data = resource.data;
  // Fecha del laboratorio (America/Tijuana), no la del navegador.
  const hoy = hoyLocal();
  const rawToday = `${diaSemana(hoy)}, ${formatearFechaLarga(hoy).replace(/ de \d{4}$/, "")}`;
  const today = rawToday.charAt(0).toUpperCase() + rawToday.slice(1);
  const firstName = (user?.nombre || user?.email || "").split(/[\s@]/)[0];
  const accesos = accesosPara({ can, alcance }, data?.pendientes || null, data?.muestras || null);

  return (
    <PageBody className="gap-8">
      {/*
       * Un solo contenedor (1200 px) y una sola retícula: el buscador, los accesos
       * rápidos y las secciones comparten los mismos bordes. Debajo, 2/3 + 1/3 en
       * pantallas grandes (≥ 1024 px), con las columnas de la misma altura; en
       * angostas, una columna: Para ti, flujo, accesos y actividad.
       */}
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8">
        <section className="flex w-full flex-col items-center pt-2 text-center sm:pt-6">
          <p className="text-[13px] text-ink-3">{today}</p>
          <h1 className="display mt-1 text-[32px] text-ink sm:text-[40px]">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}.
          </h1>
          <HomeSearch className="mt-6" />
        </section>

        {resource.error && !data ? (
          <ErrorState message={resource.error} onRetry={resource.reload} />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">
            <AccesosRapidos accesos={accesos} className="order-3 lg:order-none lg:col-span-3 lg:row-start-1" />
            {veMuestras ? <FlujoLaboratorio muestras={data ? data.muestras || [] : null} total={data?.total || 0} puedeCrear={can("muestras", "C", { objeto: "recepcion", borrador: true })} className={cn("order-2 lg:order-none lg:col-span-2 lg:col-start-1 lg:row-start-2", veActividad && "lg:row-span-2")} /> : null}
            <ParaTi pendientes={data ? data.pendientes : null} className={veMuestras ? "order-1 lg:order-none lg:col-start-3 lg:row-start-2" : "order-1 lg:order-none lg:col-span-3 lg:row-start-2"} />
            {veActividad ? <ActividadReciente registros={data ? data.actividad || [] : null} className={veMuestras ? "order-4 lg:order-none lg:col-start-3 lg:row-start-3" : "order-4 lg:order-none lg:col-span-3 lg:row-start-3"} /> : null}
          </div>
        )}
      </div>
    </PageBody>
  );
}
