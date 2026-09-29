"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Database, DownloadSimple, FileText, Key, LockKey, Terminal, Warning } from "@phosphor-icons/react";
import { PageBody } from "@/components/shell/AppShell";
import { Callout } from "@/components/features/samples/FormLayout";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/Overlay";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, EmptyState, ErrorState, Stat, TableSkeleton } from "@/components/ui/Primitives";
import { Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, getJsonAuth, sendJsonAuth } from "@/lib/client/api";
import { descargarCsv } from "@/lib/client/files";
import { invalidate, useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { fmtBytes } from "@/lib/shared/adjuntos";
import { formatearFechaHora } from "@/lib/shared/fechas";

/*
 * Respaldos (Fase 10; FX-MO-2-1 seccion 9). El Administrador tecnico
 * (usuarios:G) crea respaldos y ejecuta las pruebas de restauracion; Mejora
 * Continua, el Auditor y la Responsable General (calidad:V) consultan en solo
 * lectura. La restauracion solo se hace por linea de comandos con el servidor
 * detenido: aqui se muestra como.
 */

export default function RespaldosPage() {
  const { can } = useSession();
  const puedeVer = can("usuarios", "G") || can("calidad", "V");
  return (
    <PageBody>
      <PageHeader title="Respaldos" description="Respaldos locales de la base y los archivos, y pruebas documentadas de restauración." />
      {puedeVer ? (
        <RespaldosContent />
      ) : (
        <EmptyState icon={<LockKey size={20} />} title="Sin acceso a esta sección" description="Los respaldos los administra el Administrador técnico del sistema y los consulta Calidad." />
      )}
    </PageBody>
  );
}

function Seccion({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3" aria-label={title}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
          {description ? <p className="text-[12.5px] text-ink-3">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

const RESULTADO: Record<string, { label: string; tone: "success" | "danger" | "neutral" }> = {
  aprobada: { label: "Aprobada", tone: "success" },
  fallida: { label: "Fallida", tone: "danger" },
};

function RespaldosContent() {
  const { token } = useSession();
  const confirm = useConfirm();
  const [creando, setCreando] = useState(false);
  const resource = useResource<ApiRecord>("respaldos", () => getJsonAuth(`${API_BASE_URL}/respaldos`, token), { enabled: !!token });
  const data = resource.data;
  if (resource.error) return <ErrorState message={resource.error} onRetry={resource.reload} />;

  const respaldos = (data?.respaldos || []) as ApiRecord[];
  const actas = (data?.actas || []) as ApiRecord[];
  const avisos = (data?.avisos || []) as ApiRecord[];
  const ultimaPrueba = (data?.ultima_prueba || null) as ApiRecord | null;
  const puedeCrear = !!data?.puede_crear;
  const ultimo = respaldos[0];

  const crear = async () => {
    const ok = await confirm({
      title: "Crear respaldo ahora",
      description: "Se copia la base (snapshot en línea, sin detener el servidor), los PDF, evidencias y documentos, con su manifest y la llave de la bitácora (solo en el respaldo local). Queda en la bitácora.",
      confirmLabel: "Crear respaldo",
    });
    if (!ok) return;
    setCreando(true);
    try {
      const res = await sendJsonAuth("POST", `${API_BASE_URL}/respaldos`, token, {});
      toast.success(String(res.message || "Respaldo creado"));
      invalidate("respaldos", "dashboard");
      resource.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear el respaldo");
    } finally {
      setCreando(false);
    }
  };

  const acta = (nombre: string) => descargarCsv(`${API_BASE_URL}/respaldos/actas/${encodeURIComponent(nombre)}`, token, `acta-restauracion-${nombre}.md`);

  return (
    <div className="flex flex-col gap-8">
      {avisos.map((a) => (
        <Callout key={String(a.tipo)} tone="warning" title={String(a.titulo)}>
          {String(a.detalle)}
        </Callout>
      ))}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Último respaldo" value={data ? (ultimo ? formatearFechaHora(ultimo.creado_en) : "Ninguno") : "-"} icon={<Database size={16} />} tone={data && !ultimo ? "warning" : "neutral"} />
        <Stat label="Respaldos locales" value={data ? String(respaldos.length) : "-"} hint={data ? `Se conservan los ${String(data.retencion)} más recientes` : undefined} />
        <Stat label="Última prueba de restauración" value={data ? (ultimaPrueba ? formatearFechaHora(ultimaPrueba.fecha) : "Ninguna") : "-"} hint={ultimaPrueba ? `${String(ultimaPrueba.responsable || "—")} · ${RESULTADO[String(ultimaPrueba.resultado)]?.label || String(ultimaPrueba.resultado)}` : undefined} tone={ultimaPrueba ? (ultimaPrueba.resultado === "aprobada" ? "success" : "danger") : "warning"} />
        <Stat label="Motor" value={data ? (data.motor === "sqlite" ? "SQLite" : "MySQL/MariaDB") : "-"} hint={data ? (data.motor === "mysql" ? "Se respalda con mysqldump" : "Snapshot en línea") : undefined} />
      </div>

      <Seccion
        title="Respaldos locales"
        description="Carpetas en backups/ con la base, los archivos, el manifest (conteos, huellas SHA-256) y la llave de la bitácora aparte."
        actions={
          puedeCrear ? (
            <Button icon={<Database size={16} />} onClick={crear} loading={creando} disabled={data?.motor !== "sqlite"}>
              Crear respaldo ahora
            </Button>
          ) : (
            <Badge tone="neutral">Solo lectura</Badge>
          )
        }
      >
        <TableShell footer={data ? `${respaldos.length} respaldo${respaldos.length === 1 ? "" : "s"}` : undefined}>
          {!data ? (
            <TableSkeleton cols={5} />
          ) : !respaldos.length ? (
            <EmptyState compact icon={<Database size={20} />} title="Sin respaldos locales" description={puedeCrear ? "Crea el primero con “Crear respaldo ahora” o con npm run respaldar." : "El Administrador técnico crea los respaldos."} />
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>Respaldo</Th>
                  <Th>Tamaño</Th>
                  <Th>Bitácora</Th>
                  <Th>Llave</Th>
                  <Th>Verificación</Th>
                </tr>
              </THead>
              <TBody>
                {respaldos.map((r) => {
                  const v = r.verificacion as ApiRecord | null;
                  return (
                    <Tr key={String(r.id)} data-respaldo={String(r.id)}>
                      <Td>
                        <div className="flex flex-col">
                          <span className="font-mono text-[13px] text-ink">{String(r.id)}</span>
                          <span className="text-[12px] text-ink-3">
                            {formatearFechaHora(r.creado_en)}
                            {r.etiqueta ? ` · ${String(r.etiqueta)}` : ""}
                          </span>
                        </div>
                      </Td>
                      <Td muted>
                        {fmtBytes(Number(r.tamano))} · {String(r.archivos)} archivo{Number(r.archivos) === 1 ? "" : "s"}
                      </Td>
                      <Td muted>{(r.bitacora as ApiRecord)?.entradas ?? "—"} entradas</Td>
                      <Td>
                        {r.incluye_llave ? (
                          <Badge tone="warning">
                            <Key size={12} weight="bold" /> Incluida
                          </Badge>
                        ) : (
                          <Badge tone="neutral">No incluida</Badge>
                        )}
                      </Td>
                      <Td>
                        {v ? (
                          <button type="button" className="inline-flex" onClick={() => acta(String(v.acta))} title="Descargar el acta">
                            <Badge tone={v.resultado === "aprobada" ? "success" : "danger"}>
                              {v.resultado === "aprobada" ? "Restauración verificada" : "Prueba fallida"} · {formatearFechaHora(v.fecha)}
                            </Badge>
                          </button>
                        ) : (
                          <Badge tone="neutral">Sin prueba de restauración</Badge>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          )}
        </TableShell>
      </Seccion>

      <Seccion title="Pruebas de restauración" description="Cada prueba genera un acta con las verificaciones (integridad, esquema, llave, bitácora, conteos, huellas de archivos) y el tiempo.">
        <TableShell footer={data ? `${actas.length} acta${actas.length === 1 ? "" : "s"}` : undefined}>
          {!data ? (
            <TableSkeleton cols={5} />
          ) : !actas.length ? (
            <EmptyState compact icon={<FileText size={20} />} title="Sin pruebas de restauración" description="Ejecuta la primera prueba desde la terminal (abajo)." />
          ) : (
            <Table>
              <THead>
                <tr>
                  <Th>Fecha</Th>
                  <Th>Respaldo</Th>
                  <Th>Responsable</Th>
                  <Th>Resultado</Th>
                  <Th>Acta</Th>
                </tr>
              </THead>
              <TBody>
                {actas.map((a) => (
                  <Tr key={String(a.archivo)}>
                    <Td>{formatearFechaHora(a.fecha)}</Td>
                    <Td muted>
                      <span className="font-mono">{String(a.respaldo_id)}</span> · {a.modo === "real" ? "real" : "prueba"} · {(Number(a.duracion_ms || 0) / 1000).toFixed(1)} s
                    </Td>
                    <Td muted>{String(a.responsable || "—")}</Td>
                    <Td>
                      <Badge tone={RESULTADO[String(a.resultado)]?.tone || "neutral"} dot>
                        {RESULTADO[String(a.resultado)]?.label || String(a.resultado)}
                      </Badge>
                    </Td>
                    <Td>
                      <Button variant="secondary" size="sm" icon={<DownloadSimple size={14} />} onClick={() => acta(String(a.archivo))}>
                        Descargar acta
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </TableShell>
      </Seccion>

      <Seccion title="Cómo restaurar" description="La restauración no se ejecuta desde la interfaz: solo por línea de comandos y con el servidor detenido.">
        <div className="flex flex-col gap-3 rounded-[14px] bg-surface-2 p-4 ring-1 ring-line">
          <p className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
            <Terminal size={16} /> Prueba de restauración (trimestral; no toca la instancia real)
          </p>
          <pre className="overflow-x-auto rounded-[10px] bg-surface p-3 font-mono text-[12.5px] text-ink ring-1 ring-line">{`npm run restaurar -- --respaldo ${ultimo ? String(ultimo.id) : "<AAAAMMDD-HHMMSS>"} --responsable "Administrador técnico"`}</pre>
          <p className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
            <Warning size={16} /> Restauración real (solo ante una pérdida de datos)
          </p>
          <ol className="ml-5 list-decimal text-[13px] text-ink-2">
            <li>Detén el servidor de FICOTOX.</li>
            <li>Ejecuta la restauración con la llave de la bitácora guardada aparte si el respaldo no la incluye:</li>
          </ol>
          <pre className="overflow-x-auto rounded-[10px] bg-surface p-3 font-mono text-[12.5px] text-ink ring-1 ring-line">{`npm run restaurar -- --respaldo <AAAAMMDD-HHMMSS> --destino instance --confirmar --responsable "Administrador técnico" [--llave <ruta>]`}</pre>
          <p className="text-[12.5px] text-ink-3">Antes de sobrescribir se crea un respaldo automático de la instancia actual; al terminar se registra la restauración en la bitácora y se genera el acta. Procedimiento completo en docs/RESPALDO_Y_RECUPERACION.md.</p>
        </div>
      </Seccion>
    </div>
  );
}
