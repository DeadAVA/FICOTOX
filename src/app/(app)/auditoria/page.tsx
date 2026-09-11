"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowSquareOut, CaretDown, ShieldCheck, ShieldWarning } from "@phosphor-icons/react";
import { ChangeList } from "@/components/features/audit/AuditTimeline";
import { PageBody } from "@/components/shell/AppShell";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { FilterChips, FilterMenu, type FilterGroup } from "@/components/ui/FilterMenu";
import { PageHeader, SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { Badge, EmptyState, ErrorState, TableSkeleton } from "@/components/ui/Primitives";
import { CellPrimary, Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { cn } from "@/components/ui/cn";
import { humanizeAuditEntry, timeLabel } from "@/lib/client/audit-humanize";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { fmt, fmtDate } from "@/lib/client/format";
import { useDebouncedValue } from "@/lib/client/hooks";
import { useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/shared/sgc";

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

interface Integridad {
  ok: boolean;
  total: number;
  primer_error: number | null;
  filas_faltantes_al_final?: number;
  filas_faltantes_intermedias?: number;
  triggers_ok?: boolean;
}

/* Qué falló exactamente en la verificación, en una frase. */
function integridadDetalle(r: Integridad): string {
  if (r.primer_error) return `Alterada desde la entrada #${r.primer_error}`;
  if (r.filas_faltantes_intermedias) return `Faltan ${fmt(r.filas_faltantes_intermedias)} entradas intermedias`;
  if (r.filas_faltantes_al_final) return `Faltan ${fmt(r.filas_faltantes_al_final)} entradas al final`;
  if (r.triggers_ok === false) return "Sin protección contra cambios";
  return "Verificación fallida";
}


export default function AuditoriaPage() {
  return (
    <PageBody>
      <RequireModule modules="auditoria">
        <AuditoriaContent />
      </RequireModule>
    </PageBody>
  );
}

function AuditoriaContent() {
  const { token } = useSession();
  const [search, setSearch] = useState("");
  const [entidad, setEntidad] = useState("");
  const [accion, setAccion] = useState("");
  const [usuario, setUsuario] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [integridad, setIntegridad] = useState<Integridad | null>(null);
  const [verificando, setVerificando] = useState(false);
  const debounced = useDebouncedValue(search);
  const debouncedUsuario = useDebouncedValue(usuario);

  const resource = useResource<{ items: ApiRecord[]; summary: ApiRecord }>(
    "auditoria",
    async () => {
      const query = new URLSearchParams({ search: debounced.trim(), entidad, accion, usuario: debouncedUsuario.trim(), desde, hasta, limit: "300" });
      const [list, summary] = await Promise.all([getJsonAuth(`${API_BASE_URL}/audit?${query.toString()}`, token), getJsonAuth(`${API_BASE_URL}/audit/summary`, token).catch(() => ({}) as ApiRecord)]);
      return { items: (list.items || []) as ApiRecord[], summary: summary as ApiRecord };
    },
    { enabled: !!token, deps: [debounced, entidad, accion, debouncedUsuario, desde, hasta] },
  );
  const items = resource.data?.items;
  const summary = resource.data?.summary || {};
  const rows = useMemo(() => (items || []).map(humanizeAuditEntry), [items]);
  const toggle = (id: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const groups: FilterGroup[] = [
    { key: "entidad", label: "Entidad", value: entidad, defaultValue: "", onChange: setEntidad, options: [{ value: "", label: "Todas" }, ...Object.entries(AUDIT_ENTITIES).map(([value, label]) => ({ value, label }))] },
    { key: "accion", label: "Acción", value: accion, defaultValue: "", onChange: setAccion, options: [{ value: "", label: "Todas" }, ...Object.entries(AUDIT_ACTIONS).map(([value, label]) => ({ value, label }))] },
  ];

  const verificar = async () => {
    setVerificando(true);
    try {
      const data = await getJsonAuth(`${API_BASE_URL}/audit/verify`, token);
      const result = data as Integridad;
      setIntegridad(result);
      if (result.ok) toast.success(`Cadena íntegra: ${fmt(result.total)} entradas verificadas`);
      else toast.error(integridadDetalle(result));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo verificar");
    } finally {
      setVerificando(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Auditoría"
        description="Quién hizo qué, cuándo y por qué. Solo lectura: cada entrada guarda el dato anterior y el nuevo, el motivo y un sello encadenado con la entrada previa (ISO/IEC 17025 7.5.2 y 7.11)."
        actions={
          <>
            {integridad ? (
              <Badge tone={integridad.ok ? "success" : "danger"} dot>
                {integridad.ok ? `Íntegra · ${fmt(integridad.total)} entradas` : integridadDetalle(integridad)}
              </Badge>
            ) : null}
            <Button variant="secondary" icon={integridad && !integridad.ok ? <ShieldWarning size={16} /> : <ShieldCheck size={16} />} loading={verificando} onClick={verificar}>
              Verificar integridad
            </Button>
          </>
        }
      />

      <Toolbar
        end={
          resource.data ? (
            <p className="tnum text-[12.5px] text-ink-3">
              Total <span className="font-medium text-ink">{fmt(summary.total || 0)}</span> · 30 días <span className="font-medium text-ink">{fmt(summary.ultimos_30_dias || 0)}</span> · Anulaciones <span className="font-medium text-ink">{fmt(summary.anulaciones || 0)}</span> · Accesos fallidos{" "}
              <span className={cn("font-medium", summary.accesos_fallidos_30_dias ? "text-danger" : "text-ink")}>{fmt(summary.accesos_fallidos_30_dias || 0)}</span>
            </p>
          ) : null
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Folio, referencia o motivo" className="w-full md:w-[340px]" />
        <FilterMenu groups={groups}>
          <Field label="Usuario" htmlFor="aud-usuario">
            <Input id="aud-usuario" value={usuario} onChange={(event) => setUsuario(event.target.value)} placeholder="Nombre o correo" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Desde" htmlFor="aud-desde">
              <Input id="aud-desde" type="date" value={desde} onChange={(event) => setDesde(event.target.value)} />
            </Field>
            <Field label="Hasta" htmlFor="aud-hasta">
              <Input id="aud-hasta" type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} />
            </Field>
          </div>
        </FilterMenu>
        <FilterChips groups={groups} />
        {usuario || desde || hasta ? (
          <button type="button" onClick={() => { setUsuario(""); setDesde(""); setHasta(""); }} className="press inline-flex h-7 items-center gap-1 rounded-full bg-brand-soft px-2.5 text-[12.5px] font-medium text-brand-strong">
            {[usuario ? `Usuario: ${usuario}` : null, desde ? `Desde ${fmtDate(desde)}` : null, hasta ? `Hasta ${fmtDate(hasta)}` : null].filter(Boolean).join(" · ")} <span aria-hidden="true" className="text-brand">×</span>
          </button>
        ) : null}
      </Toolbar>

      <TableShell footer={items ? `${fmt(items.length)} movimientos, del más reciente al más antiguo${items.length >= 300 ? " · se muestran los 300 más recientes; acota con los filtros para ver más atrás" : ""}` : undefined}>
        {resource.error ? (
          <ErrorState message={resource.error} onRetry={resource.reload} />
        ) : !items ? (
          <TableSkeleton cols={6} />
        ) : !rows.length ? (
          <EmptyState title="Sin movimientos" description="No hay entradas con esos filtros." />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Fecha</Th>
                <Th>Usuario</Th>
                <Th>Acción</Th>
                <Th>Qué pasó</Th>
                <Th>Registro</Th>
                <Th align="right" sticky />
              </tr>
            </THead>
            <TBody>
              {rows.map((entry) => {
                const expanded = open.has(entry.id);
                const hasDetails = entry.changes.length > 0;
                const sub = [entry.motivo ? `“${entry.motivo}”` : null, ...entry.facts].filter(Boolean).join(" · ");
                return (
                  <Fragment key={entry.id}>
                    <Tr interactive={hasDetails} onClick={hasDetails ? () => toggle(entry.id) : undefined} aria-expanded={hasDetails ? expanded : undefined}>
                      <Td className="whitespace-nowrap">
                        <CellPrimary title={entry.when ? fmtDate(entry.when) : "—"} subtitle={timeLabel(entry.when)} />
                      </Td>
                      <Td className="max-w-[170px]">
                        <CellPrimary title={entry.actor || "—"} subtitle={entry.actorEmail || undefined} />
                      </Td>
                      <Td>
                        <Badge tone={entry.tone} dot>
                          {AUDIT_ACTIONS[entry.verb] || entry.verb}
                        </Badge>
                      </Td>
                      <Td className="min-w-[240px] max-w-[400px]">
                        <CellPrimary title={capitalize(entry.action)} subtitle={sub || undefined} />
                      </Td>
                      <Td className="min-w-[190px] max-w-[220px] whitespace-nowrap">
                        {entry.verb === "login" || entry.verb === "login_fallido" ? (
                          <span className="text-ink-4">—</span>
                        ) : (
                          <CellPrimary
                            title={entry.entityLabel}
                            subtitle={
                              entry.reference ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="code">{entry.reference}</span>
                                  {entry.href ? (
                                    <Link href={entry.href} onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-0.5 text-brand hover:underline">
                                      Abrir <ArrowSquareOut size={11} />
                                    </Link>
                                  ) : null}
                                </span>
                              ) : undefined
                            }
                          />
                        )}
                      </Td>
                      <Td align="right" sticky className="whitespace-nowrap">
                        {hasDetails ? (
                          <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand">
                            {entry.changes.length === 1 ? "1 cambio" : `${entry.changes.length} cambios`}
                            <CaretDown size={12} weight="bold" className={cn("transition-transform", expanded && "rotate-180")} />
                          </span>
                        ) : (
                          <span className="text-[12.5px] text-ink-4">Sin cambios</span>
                        )}
                      </Td>
                    </Tr>
                    {expanded ? (
                      <tr className="bg-surface-2/50">
                        <td colSpan={6} className="px-6 py-4">
                          <ChangeList changes={entry.changes} />
                          {entry.hash ? (
                            <p className="mt-3 inline-flex items-center gap-1 text-[11px] text-ink-4" title="Sello de integridad: cada entrada firma la anterior; si alguien altera la bitácora, la cadena se rompe.">
                              <ShieldCheck size={12} /> Sello <span className="code">{entry.hash.slice(0, 12)}</span>
                            </p>
                          ) : null}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </TBody>
          </Table>
        )}
      </TableShell>
    </>
  );
}
