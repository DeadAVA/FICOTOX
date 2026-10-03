"use client";

import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { Badge } from "@/components/ui/Primitives";
import { fmtBytes, huellaCorta } from "@/lib/shared/adjuntos";
import { formatearFecha, formatearFechaHora } from "@/lib/shared/fechas";
import type { DocumentoBiblioteca, VersionBiblioteca } from "./tipos";

/* Informacion del documento y de la version abierta, con la lista de versiones (cada una se abre en el visor). */
export function PanelInformacion({ item, versiones, abierta }: { item: DocumentoBiblioteca; versiones: VersionBiblioteca[]; abierta: VersionBiblioteca }) {
  const fila = (etiqueta: string, valor: React.ReactNode) => (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11.5px] font-medium uppercase tracking-wide text-ink-4">{etiqueta}</dt>
      <dd className="text-[13.5px] text-ink">{valor}</dd>
    </div>
  );
  return (
    <div className="flex flex-col gap-5" data-testid="visor-info">
      {item.descripcion ? <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-ink-2">{item.descripcion}</p> : <p className="text-[13px] text-ink-4">Sin descripción.</p>}
      {item.etiquetas.length ? (
        <div className="flex flex-wrap gap-1.5" aria-label="Etiquetas">
          {item.etiquetas.map((e) => (
            <Badge key={e}>{e}</Badge>
          ))}
        </div>
      ) : null}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        {fila("Categoría", item.categoria || "—")}
        {fila("Clave", item.clave ? <span className="code">{item.clave}</span> : "—")}
        {fila("Fecha del documento", item.fecha_documento ? formatearFecha(item.fecha_documento) : "—")}
        {fila("Visible para", item.visibilidad === "todos" ? "Todos" : item.roles.map((r) => r.nombre).join(", ") || "Algunos roles")}
        {fila("Subió esta versión", abierta.subido_por_nombre || "—")}
        {fila("Fecha de subida", formatearFechaHora(abierta.subido_en))}
        {fila("Archivo", <span className="break-all">{abierta.nombre_original}</span>)}
        {fila("Tamaño", fmtBytes(Number(abierta.tamano_bytes)))}
        {fila("SHA-256", <span className="code" title={abierta.sha256}>{huellaCorta(abierta.sha256)}</span>)}
        {fila("Creado por", item.creado_por_nombre || "—")}
      </dl>
      <section aria-labelledby="visor-versiones" className="flex flex-col gap-2">
        <h3 id="visor-versiones" className="text-[13px] font-semibold text-ink">
          Versiones <span className="font-normal text-ink-3">· {versiones.length}</span>
        </h3>
        <ol className="flex flex-col gap-1.5">
          {versiones.map((v) => {
            const vigente = Number(v.id) === Number(item.version_actual_id);
            const esta = Number(v.id) === Number(abierta.id);
            return (
              <li key={v.id}>
                <Link
                  href={vigente ? `/calidad/biblioteca/${item.id}` : `/calidad/biblioteca/${item.id}?version=${v.id}`}
                  aria-current={esta ? "page" : undefined}
                  data-version={v.numero}
                  className={cn("press flex flex-col gap-0.5 rounded-[10px] px-3 py-2 ring-1", esta ? "bg-brand-faint ring-brand/30" : "bg-surface-2 ring-line hover:bg-surface-3")}
                >
                  <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
                    Versión {v.numero}
                    {vigente ? <Badge tone="success">Vigente</Badge> : <Badge>Anterior</Badge>}
                    {esta ? <span className="ml-auto text-[11.5px] font-normal text-brand-strong">Abierta</span> : null}
                  </span>
                  <span className="text-[12px] text-ink-3">
                    {formatearFechaHora(v.subido_en)} · {v.subido_por_nombre || "—"} · {fmtBytes(Number(v.tamano_bytes))}
                  </span>
                  {v.nota_version ? <span className="whitespace-pre-line text-[12px] text-ink-2">{v.nota_version}</span> : null}
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
