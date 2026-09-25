"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowSquareOut, ArrowUUpLeft, CheckCircle, SealCheck } from "@phosphor-icons/react";
import { PageBody } from "@/components/shell/AppShell";
import { CampoIdentidad } from "@/components/session/Reautenticar";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Field";
import { Dialog, usePrompt } from "@/components/ui/Overlay";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, EmptyState, ErrorState, TableSkeleton } from "@/components/ui/Primitives";
import { CellPrimary, Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, armarReauth, getJsonAuth, sendJsonAuth } from "@/lib/client/api";
import { fmtDateTime } from "@/lib/client/format";
import { invalidate, useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";

/*
 * "Por supervisar" (Fase 2). Lo que captura una persona supervisada (alcance
 * "supervisado" o cuenta temporal con supervisor) queda pendiente del visto
 * bueno de su supervisor. Aqui el supervisor da el visto bueno (confirmando su
 * contrasena) o lo regresa con observaciones; quien lo capturo ve lo que le
 * regresaron para corregirlo. Ambas acciones quedan en la bitacora.
 * La ve toda persona con sesion: la bandeja solo trae lo que le toca.
 */

interface Bandeja {
  por_supervisar: ApiRecord[];
  regresados: ApiRecord[];
}

const KEYS = ["supervision", "muestras", "informes", "reactivos", "consumibles", "equipos", "mantenimientos", "dashboard"];

export default function SupervisionPage() {
  const { token } = useSession();
  const prompt = usePrompt();
  const [vistoBueno, setVistoBueno] = useState<ApiRecord | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [clave, setClave] = useState("");
  const [enviando, setEnviando] = useState(false);

  const resource = useResource<Bandeja>(
    KEYS,
    async () => {
      const data = await getJsonAuth(`${API_BASE_URL}/supervision`, token);
      return { por_supervisar: (data.por_supervisar || []) as ApiRecord[], regresados: (data.regresados || []) as ApiRecord[] };
    },
    { enabled: !!token },
  );
  const pendientes = resource.data?.por_supervisar || [];
  const regresados = resource.data?.regresados || [];

  const abrirVistoBueno = (item: ApiRecord) => {
    setObservaciones("");
    setClave("");
    setVistoBueno(item);
  };

  const confirmarVistoBueno = async () => {
    if (!vistoBueno) return;
    setEnviando(true);
    // El visto bueno exige confirmar la identidad: la contrasena de este dialogo se usa en la reautenticacion.
    armarReauth(clave ? { password: clave } : null);
    setClave("");
    try {
      await sendJsonAuth("POST", `${API_BASE_URL}/supervision/${vistoBueno.tabla}/${vistoBueno.id}/visto-bueno`, token, { observaciones: observaciones.trim() || null });
      toast.success(`Visto bueno registrado: ${vistoBueno.tipo} ${vistoBueno.referencia}`);
      setVistoBueno(null);
      invalidate(...KEYS);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo registrar el visto bueno");
    } finally {
      setEnviando(false);
    }
  };

  const regresar = async (item: ApiRecord) => {
    const obs = await prompt({
      title: `Regresar ${item.tipo} ${item.referencia}`,
      description: "Quien lo capturó verá tus observaciones para corregirlo; mientras tanto el registro no avanza.",
      label: "Observaciones",
      placeholder: "Qué debe corregir o completar",
      minLength: 5,
      confirmLabel: "Regresar con observaciones",
      tone: "danger",
    });
    if (!obs) return;
    try {
      await sendJsonAuth("POST", `${API_BASE_URL}/supervision/${item.tabla}/${item.id}/regresar`, token, { observaciones: obs });
      toast.success("Registro regresado con observaciones");
      invalidate(...KEYS);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo regresar el registro");
    }
  };

  return (
    <PageBody>
      <PageHeader title="Por supervisar" description="Registros capturados bajo supervisión: no avanzan (no se cierran, no se revisan ni aprueban y no sirven de origen) hasta el visto bueno del supervisor." />

      {resource.error ? <ErrorState message={resource.error} onRetry={resource.reload} /> : null}

      <section className="flex flex-col gap-3" aria-labelledby="sup-pendientes">
        <h2 id="sup-pendientes" className="title-3 text-ink">
          Pendientes de tu visto bueno
        </h2>
        <TableShell>
          {resource.loading && !resource.data ? (
            <TableSkeleton rows={3} cols={4} />
          ) : pendientes.length ? (
            <Table>
              <THead>
                <Tr>
                  <Th>Registro</Th>
                  <Th>Capturó</Th>
                  <Th>Desde</Th>
                  <Th align="right">Acciones</Th>
                </Tr>
              </THead>
              <TBody>
                {pendientes.map((item) => (
                  <Tr key={`${item.tabla}-${item.id}`}>
                    <Td>
                      <CellPrimary title={`${item.tipo} ${item.referencia}`} subtitle={<Badge tone="warning">Pendiente de visto bueno</Badge>} />
                    </Td>
                    <Td muted>{item.solicitado_por || "—"}</Td>
                    <Td muted>{item.solicitado_en ? fmtDateTime(item.solicitado_en) : "—"}</Td>
                    <Td align="right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link href={String(item.href)} className="press inline-flex h-8 items-center gap-1.5 rounded-[9px] px-2.5 text-[13px] text-ink-2 hover:bg-surface-2">
                          <ArrowSquareOut size={15} /> Abrir
                        </Link>
                        <Button size="sm" variant="secondary" icon={<ArrowUUpLeft size={15} />} onClick={() => regresar(item)}>
                          Regresar
                        </Button>
                        <Button size="sm" icon={<SealCheck size={15} />} onClick={() => abrirVistoBueno(item)}>
                          Dar visto bueno
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          ) : (
            <EmptyState compact icon={<CheckCircle size={22} weight="duotone" />} title="Nada pendiente de tu visto bueno" description="Cuando una persona que supervisas capture un registro, aparecerá aquí." />
          )}
        </TableShell>
      </section>

      {regresados.length ? (
        <section className="flex flex-col gap-3" aria-labelledby="sup-regresados">
          <h2 id="sup-regresados" className="title-3 text-ink">
            Regresados a ti
          </h2>
          <TableShell>
            <Table>
              <THead>
                <Tr>
                  <Th>Registro</Th>
                  <Th>Observaciones del supervisor</Th>
                  <Th align="right">Acción</Th>
                </Tr>
              </THead>
              <TBody>
                {regresados.map((item) => (
                  <Tr key={`${item.tabla}-${item.id}`}>
                    <Td>
                      <CellPrimary title={`${item.tipo} ${item.referencia}`} subtitle={<Badge tone="danger">Regresado</Badge>} />
                    </Td>
                    <Td>{item.observaciones || "—"}</Td>
                    <Td align="right">
                      <Link href={String(item.href)} className="press inline-flex h-8 items-center gap-1.5 rounded-[9px] bg-brand px-3 text-[13px] font-medium text-white hover:bg-brand-strong">
                        Corregir
                      </Link>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </TableShell>
        </section>
      ) : null}

      <Dialog
        open={!!vistoBueno}
        onOpenChange={(open) => !open && setVistoBueno(null)}
        title={vistoBueno ? `Visto bueno: ${vistoBueno.tipo} ${vistoBueno.referencia}` : "Visto bueno"}
        description="A partir de tu visto bueno el registro puede avanzar. Queda en la bitácora con tu usuario."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setVistoBueno(null)}>
              Cancelar
            </Button>
            <Button icon={<SealCheck size={16} />} loading={enviando} onClick={confirmarVistoBueno}>
              Dar visto bueno
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Observaciones (opcional)" htmlFor="vb-obs">
            <Textarea id="vb-obs" rows={3} value={observaciones} onChange={(event) => setObservaciones(event.target.value)} />
          </Field>
          <CampoIdentidad value={clave} onChange={setClave} id="vb-password" />
        </div>
      </Dialog>
    </PageBody>
  );
}
