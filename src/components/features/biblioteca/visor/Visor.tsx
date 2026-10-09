"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CaretDown, CaretUp, CornersIn, CornersOut, DownloadSimple, Info, Printer } from "@phosphor-icons/react";
import { Callout } from "@/components/features/samples/FormLayout";
import { useSession } from "@/components/session/SessionProvider";
import { Button, IconButton } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Sheet } from "@/components/ui/Overlay";
import { Badge } from "@/components/ui/Primitives";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { explicarError } from "@/lib/client/mensajes";
import { vistaDe } from "@/lib/shared/biblioteca";
import { formatearFecha } from "@/lib/shared/fechas";
import { FichaArchivo } from "./FichaArchivo";
import { PanelInformacion } from "./PanelInformacion";
import type { DocumentoBiblioteca, Integridad, VersionBiblioteca } from "./tipos";
import { descargarVersion, imprimirPdf } from "./usarArchivo";
import { VisorDocx } from "./VisorDocx";
import { VisorHoja } from "./VisorHoja";
import { VisorImagen } from "./VisorImagen";
import { VisorPdf } from "./VisorPdf";
import { VisorTexto } from "./VisorTexto";

/* Pantalla amplia (panel de informacion al lado) o angosta (panel en hoja). */
export function useAncho(minimo: number): boolean {
  const [ancho, setAncho] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minimo}px)`);
    const cambiar = () => setAncho(mq.matches);
    cambiar();
    mq.addEventListener("change", cambiar);
    return () => mq.removeEventListener("change", cambiar);
  }, [minimo]);
  return ancho;
}

export const ESTILOS_IMPRESION = `
@media print {
  body * { visibility: hidden !important; }
  [data-visor-contenido], [data-visor-contenido] * { visibility: visible !important; }
  [data-visor-contenido] { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; height: auto !important; overflow: visible !important; }
  [data-visor-contenido] .scroll-thin { overflow: visible !important; height: auto !important; }
}
`;

/*
 * Visor de un documento de la biblioteca: encabezado compacto (ocultable),
 * contenido segun el tipo y panel de informacion con las versiones.
 */
export function Visor({ item, versiones, versionId }: { item: DocumentoBiblioteca; versiones: VersionBiblioteca[]; versionId: number | null }) {
  const { token } = useSession();
  const raiz = useRef<HTMLDivElement | null>(null);
  const amplia = useAncho(1024);
  const [encabezado, setEncabezado] = useState(true);
  const [info, setInfo] = useState<boolean | null>(null);
  const [completa, setCompleta] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [integridadAnterior, setIntegridadAnterior] = useState<{ id: number; estado: Integridad } | null>(null);
  const vigente = versiones.find((v) => Number(v.id) === Number(item.version_actual_id)) || versiones[0];
  const abierta = (versionId ? versiones.find((v) => Number(v.id) === versionId) : null) || vigente;
  const esAnterior = !!abierta && !!vigente && Number(abierta.id) !== Number(vigente.id);
  // En pantalla amplia el panel arranca cerrado para leer; se abre con "Información".
  const panelAbierto = info ?? false;

  // La version vigente ya viene verificada; una anterior se verifica al abrirla (alerta e incidencia en el servidor si falla).
  useEffect(() => {
    if (!esAnterior || !abierta || !token) return;
    let vivo = true;
    getJsonAuth(`${API_BASE_URL}/biblioteca/versiones/${abierta.id}/verificar`, token)
      .then((r) => vivo && setIntegridadAnterior({ id: Number(abierta.id), estado: r.integridad as Integridad }))
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [esAnterior, abierta, token]);
  const integridad: Integridad | null = esAnterior ? (integridadAnterior && integridadAnterior.id === Number(abierta?.id) ? integridadAnterior.estado : null) : item.integridad;

  useEffect(() => {
    const cambio = () => setCompleta(document.fullscreenElement === raiz.current);
    document.addEventListener("fullscreenchange", cambio);
    return () => document.removeEventListener("fullscreenchange", cambio);
  }, []);
  const pantallaCompleta = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await raiz.current?.requestFullscreen();
    } catch {
      toast.error("El navegador no permitió la pantalla completa");
    }
  };

  const descargar = async () => {
    if (!abierta) return;
    setDescargando(true);
    try {
      await descargarVersion(Number(abierta.id), token, abierta.nombre_original);
    } catch (err) {
      const e = explicarError(err, "No se pudo descargar el archivo");
      toast.error(e.que, { description: e.hacer });
    } finally {
      setDescargando(false);
    }
  };
  const vista = abierta ? vistaDe(abierta.extension) : "ficha";
  const imprimir = async () => {
    if (!abierta) return;
    if (vista === "pdf") {
      try {
        await imprimirPdf(Number(abierta.id), token);
      } catch (err) {
        toast.error(explicarError(err, "No se pudo preparar la impresión").que);
      }
    } else window.print();
  };

  if (!abierta) {
    return (
      <div className="p-6">
        <Callout tone="warning" title="Documento sin archivo">Este documento no tiene versiones con archivo.</Callout>
      </div>
    );
  }

  const contenido = (() => {
    if (integridad === "faltante") return null;
    const id = Number(abierta.id);
    switch (vista) {
      case "pdf":
        return <VisorPdf key={id} versionId={id} docId={item.id} conTexto={abierta.con_texto} compacto={!amplia} />;
      case "imagen":
        return <VisorImagen key={id} versionId={id} extension={abierta.extension} titulo={item.titulo} />;
      case "docx":
        return <VisorDocx key={id} versionId={id} />;
      case "hoja":
        return <VisorHoja key={id} versionId={id} />;
      case "texto":
      case "markdown":
        return <VisorTexto key={id} versionId={id} markdown={vista === "markdown"} />;
      default:
        return <FichaArchivo version={abierta} onDescargar={descargar} descargando={descargando} />;
    }
  })();

  const panel = <PanelInformacion item={item} versiones={versiones} abierta={abierta} />;

  return (
    <div ref={raiz} className={cn("flex flex-col overflow-hidden bg-canvas", completa ? "h-dvh" : "-mx-4 -my-6 h-[calc(100dvh-56px)] sm:-mx-8 sm:-my-8 lg:h-dvh")} data-visor>
      <style>{ESTILOS_IMPRESION}</style>
      {encabezado ? (
        <header className="material z-10 flex flex-wrap items-center gap-2 border-b border-line/70 px-3 py-2 sm:px-4">
          <Link href="/calidad/biblioteca" aria-label="Volver a la biblioteca" title="Volver a la biblioteca" className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-ink-2 shadow-card hover:text-ink">
            <ArrowLeft size={16} weight="bold" />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col">
            <h1 className="truncate text-[15.5px] font-semibold tracking-[-0.01em] text-ink" title={item.titulo}>
              {item.titulo}
            </h1>
            <p className="flex min-w-0 items-center gap-1.5 truncate text-[12px] text-ink-3">
              {item.categoria ? <span>{item.categoria}</span> : null}
              {item.clave ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="code">{item.clave}</span>
                </>
              ) : null}
              <span aria-hidden="true">·</span>
              <span>Versión {abierta.numero}</span>
              {esAnterior ? <Badge tone="warning">Versión anterior</Badge> : null}
              {item.archivado_en ? <Badge tone="neutral">Archivado</Badge> : null}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {/* El boton con texto en pantallas anchas; en angostas, solo el icono (el envoltorio decide cual se ve). */}
            <span className="hidden sm:contents">
              <Button variant="secondary" size="sm" icon={<DownloadSimple size={15} />} onClick={descargar} loading={descargando}>
                Descargar
              </Button>
            </span>
            <span className="contents sm:hidden">
              <IconButton label="Descargar" onClick={descargar}>
                <DownloadSimple size={17} />
              </IconButton>
            </span>
            <IconButton label="Imprimir" onClick={imprimir} disabled={integridad === "faltante" || vista === "ficha"}>
              <Printer size={17} />
            </IconButton>
            <IconButton label={completa ? "Salir de pantalla completa" : "Pantalla completa"} onClick={pantallaCompleta}>
              {completa ? <CornersIn size={17} /> : <CornersOut size={17} />}
            </IconButton>
            <IconButton label={panelAbierto ? "Ocultar información" : "Información y versiones"} onClick={() => setInfo(!panelAbierto)} aria-pressed={panelAbierto}>
              <Info size={17} />
            </IconButton>
            <IconButton label="Ocultar encabezado" onClick={() => setEncabezado(false)}>
              <CaretUp size={16} />
            </IconButton>
          </div>
        </header>
      ) : (
        <button type="button" onClick={() => setEncabezado(true)} aria-label="Mostrar encabezado" className="press material absolute top-2 right-3 z-20 flex h-8 items-center gap-1 rounded-full px-3 text-[12px] font-medium text-ink-2 shadow-card hover:text-ink">
          <CaretDown size={14} /> {item.titulo.length > 28 ? `${item.titulo.slice(0, 28)}…` : item.titulo}
        </button>
      )}

      {esAnterior || integridad === "alterado" || integridad === "faltante" || item.archivado_en ? (
        <div className="flex flex-col gap-2 border-b border-line bg-surface px-3 py-2 sm:px-4">
          {integridad === "alterado" || integridad === "faltante" ? (
            <div data-testid="visor-aviso-integridad">
              <Callout tone="danger" title={integridad === "faltante" ? "El archivo no está en el servidor" : "El archivo no coincide con su huella SHA-256"}>
                {integridad === "faltante" ? "No se puede mostrar esta versión. " : "El contenido pudo alterarse fuera de la plataforma; no lo uses como referencia hasta aclararlo. "}
                Se registró una alerta de integridad en la bitácora y una incidencia para Calidad.
              </Callout>
            </div>
          ) : null}
          {esAnterior ? (
            <div data-testid="visor-version-anterior">
              <Callout tone="warning" title={`Versión anterior (versión ${abierta.numero})`}>
                Estás viendo una versión que ya fue reemplazada.{" "}
                <Link href={`/calidad/biblioteca/${item.id}`} className="font-medium text-brand-strong underline underline-offset-2">
                  Abrir la versión vigente ({vigente.numero})
                </Link>
              </Callout>
            </div>
          ) : null}
          {item.archivado_en ? (
            <Callout tone="info" title="Documento archivado">
              Archivado el {formatearFecha(item.archivado_en)}{item.motivo_archivo ? `. Motivo: ${item.motivo_archivo}` : ""}.
            </Callout>
          ) : null}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <div className="min-h-0 min-w-0 flex-1" data-visor-contenido>
          {contenido ?? <FichaArchivo version={abierta} onDescargar={descargar} descargando={descargando} />}
        </div>
        {panelAbierto && amplia ? (
          <aside className="scroll-thin w-[320px] shrink-0 overflow-y-auto border-l border-line bg-surface p-4" aria-label="Información del documento">
            {panel}
          </aside>
        ) : null}
      </div>
      {!amplia ? (
        <Sheet open={panelAbierto} onOpenChange={(v) => setInfo(v)} title="Información" description={item.titulo}>
          {panel}
        </Sheet>
      ) : null}
    </div>
  );
}
