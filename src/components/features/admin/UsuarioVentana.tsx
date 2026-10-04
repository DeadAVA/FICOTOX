"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { LockOpen, Plus, Prohibit } from "@phosphor-icons/react";
import { AutorizacionesUsuario } from "@/components/features/admin/AutorizacionesPanel";
import { Callout } from "@/components/features/samples/FormLayout";
import { SolicitudBannerDe } from "@/components/features/solicitudes/Solicitudes";
import { CampoIdentidad } from "@/components/session/Reautenticar";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { DateInput } from "@/components/ui/DateInput";
import { Field, FormGrid, Select, Textarea } from "@/components/ui/Field";
import { Dialog, usePrompt } from "@/components/ui/Overlay";
import { SegmentedTabs } from "@/components/ui/PageHeader";
import { Badge, Skeleton, type Tone } from "@/components/ui/Primitives";
import { cn } from "@/components/ui/cn";
import { VentanaCentrada, VentanaTitulo } from "@/components/ui/VentanaCentrada";
import { useValidacion, ValidacionAmbito } from "@/components/ui/Validacion";
import { haceCuanto } from "@/lib/client/audit-humanize";
import { API_BASE_URL, armarReauth, getJsonAuth, sendJsonAuth } from "@/lib/client/api";
import { msg, type Problema } from "@/lib/client/mensajes";
import { invalidate } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { formatearFecha, formatearFechaHora, formatearHora, hoyLocal, instanteDe } from "@/lib/shared/fechas";

/*
 * Ventana de una persona (Administración › Usuarios), con la misma ventana
 * centrada de Auditoría: encabezado (nombre, correo, estado y cargo) y tres
 * pestañas en palabras simples: General, Roles y Autorizaciones. Las acciones
 * son las de siempre (motivo, reautenticación, segundo usuario, guardas).
 */

/* Estado de la cuenta en una palabra (el mismo en la lista y en la ventana). */
export function estadoCuenta(item: ApiRecord): { label: string; tone: Tone } {
  if (!item.activo) return { label: "De baja", tone: "neutral" };
  if (item.bloqueado_hasta) return { label: "Bloqueado", tone: "danger" };
  if (item.cuenta_vigente === false) return { label: "Acceso vencido", tone: "warning" };
  if (String(item.tipo_cuenta || "permanente") === "temporal") return { label: "Temporal", tone: "brand" };
  return { label: "Activo", tone: "success" };
}

/* Avatar con iniciales ("Mariana Delgado" -> "MD"). */
export function Iniciales({ nombre, grande = false }: { nombre: unknown; grande?: boolean }) {
  const palabras = String(nombre || "?").replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  const letras = ((palabras[0]?.[0] || "?") + (palabras[1]?.[0] || "")).toUpperCase();
  return (
    <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand-strong", grande ? "h-12 w-12 text-[17px]" : "h-9 w-9 text-[13px]")}>
      {letras}
    </span>
  );
}

/* "hace 2 h" (o "Nunca"). */
export function ultimoAcceso(item: ApiRecord): string {
  const cuando = instanteDe(item.ultimo_acceso);
  return cuando ? haceCuanto(cuando) : "Nunca ha entrado";
}

const ESTADO_ASIGNACION: Record<string, { label: string; tone: Tone }> = {
  vigente: { label: "Vigente", tone: "success" },
  futuro: { label: "Por comenzar", tone: "brand" },
  vencido: { label: "Terminado", tone: "neutral" },
  revocado: { label: "Revocado", tone: "danger" },
};

type Pestana = "general" | "roles" | "autorizaciones";

export function UsuarioVentana({ usuarios, indice, onIndice, onCerrar, onDesbloquear }: { usuarios: ApiRecord[]; indice: number | null; onIndice: (indice: number) => void; onCerrar: () => void; onDesbloquear: (item: ApiRecord) => Promise<void> }) {
  const item = indice !== null ? usuarios[indice] : undefined;
  const mover = (paso: number) => {
    if (indice === null) return;
    const siguiente = indice + paso;
    if (siguiente >= 0 && siguiente < usuarios.length) onIndice(siguiente);
  };
  return (
    <VentanaCentrada abierta={!!item} onCerrar={onCerrar} onMover={mover} puedeAnterior={indice !== null && indice > 0} puedeSiguiente={indice !== null && indice < usuarios.length - 1} etiquetaAnterior="Persona anterior" etiquetaSiguiente="Persona siguiente">
      {item ? <FichaUsuario key={String(item.id)} base={item} onDesbloquear={onDesbloquear} /> : <VentanaTitulo className="sr-only">Usuario</VentanaTitulo>}
    </VentanaCentrada>
  );
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="contents">
      <dt className="text-ink-3">{etiqueta}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}

function FichaUsuario({ base, onDesbloquear }: { base: ApiRecord; onDesbloquear: (item: ApiRecord) => Promise<void> }) {
  const { token, can, user: me } = useSession();
  const prompt = usePrompt();
  const [pestana, setPestana] = useState<Pestana>("general");
  const [detalle, setDetalle] = useState<ApiRecord | null>(null);
  const [asignar, setAsignar] = useState(false);
  const canAdmin = can("usuarios", "G");
  const esPropia = Number(me?.id) === Number(base.id);
  const item = detalle || base;
  const estado = estadoCuenta(item);

  const cargar = useCallback(async () => {
    try {
      const data = await getJsonAuth(`${API_BASE_URL}/admin/usuarios/${base.id}`, token);
      setDetalle({ ...base, ...((data.item || {}) as ApiRecord) });
    } catch {
      setDetalle(base);
    }
  }, [base, token]);
  useEffect(() => {
    void Promise.resolve().then(cargar);
  }, [cargar]);

  const asignaciones = useMemo(() => {
    const peso: Record<string, number> = { vigente: 0, futuro: 1, vencido: 2, revocado: 3 };
    return [...(((detalle?.asignaciones as ApiRecord[] | undefined) || []) as ApiRecord[])].sort((a, b) => (peso[String(a.estado)] ?? 9) - (peso[String(b.estado)] ?? 9));
  }, [detalle]);
  const actuales = asignaciones.filter((a) => a.estado === "vigente" || a.estado === "futuro");
  const anteriores = asignaciones.filter((a) => a.estado !== "vigente" && a.estado !== "futuro");
  const [verAnteriores, setVerAnteriores] = useState(false);
  const vRevocar = useValidacion({ titulo: "No se pudo revocar el rol", reglas: () => [] });

  const revocar = async (asignacion: ApiRecord) => {
    const motivo = await prompt({ critico: true, title: `Revocar el rol «${asignacion.rol}»`, description: "La asignación se conserva en el historial como revocada; los permisos dejan de contar de inmediato.", label: "Motivo", minLength: 5, confirmLabel: "Revocar", tone: "danger" });
    if (!motivo) return;
    try {
      await sendJsonAuth("POST", `${API_BASE_URL}/admin/usuarios/${base.id}/roles/${asignacion.id}/revocar`, token, { motivo });
      toast.success("Rol revocado");
      await cargar();
      invalidate("usuarios", "roles");
    } catch (err) {
      vRevocar.errorServidor(err);
    }
  };

  return (
    <div className="flex flex-col gap-5" data-usuario-ventana={String(base.id)}>
      <header className="flex items-start gap-3.5">
        <Iniciales nombre={item.nombre || item.email} grande />
        <div className="flex min-w-0 flex-col gap-1">
          <VentanaTitulo>
            {String(item.nombre || item.email || "Sin nombre")}
            {esPropia ? <span className="ml-1.5 text-[13px] font-normal text-ink-3">(tú)</span> : null}
          </VentanaTitulo>
          <p className="truncate text-[13.5px] text-ink-3">{String(item.email || "")}</p>
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
            <Badge tone={estado.tone} dot>
              {estado.label}
            </Badge>
            {item.cargo_predeterminado ? <span>Firma como {String(item.cargo_predeterminado)}</span> : null}
          </div>
        </div>
      </header>

      <SegmentedTabs
        size="sm"
        label="Información de la persona"
        value={pestana}
        onChange={setPestana}
        options={[
          { value: "general", label: "General" },
          { value: "roles", label: "Roles" },
          { value: "autorizaciones", label: "Autorizaciones" },
        ]}
      />

      {pestana === "general" ? (
        <div className="flex flex-col gap-4">
          <SolicitudBannerDe entidad="usuarios" entidadId={Number(base.id)} />
          {item.bloqueado_hasta ? (
            <Callout tone="danger" title={`Cuenta bloqueada hasta las ${formatearHora(item.bloqueado_hasta)}`}>
              <span className="block">Por varios intentos fallidos de entrar. Se desbloquea sola a esa hora.</span>
              {canAdmin ? (
                <Button size="sm" variant="secondary" className="mt-2" icon={<LockOpen size={14} />} onClick={async () => { await onDesbloquear(item); await cargar(); }}>
                  Desbloquear
                </Button>
              ) : null}
            </Callout>
          ) : null}
          <dl className="grid gap-x-5 gap-y-2.5 text-[14px] sm:grid-cols-[max-content_minmax(0,1fr)]">
            <Dato etiqueta="Tipo de cuenta">{String(item.tipo_cuenta || "permanente") === "temporal" ? "Temporal" : "Permanente"}</Dato>
            <Dato etiqueta="Vigencia">
              {item.vigente_desde || item.vigente_hasta ? `${item.vigente_desde ? `Desde el ${formatearFecha(item.vigente_desde)}` : "Desde su alta"}${item.vigente_hasta ? ` hasta el ${formatearFecha(item.vigente_hasta)}` : ", sin fecha de fin"}` : "Sin fecha de fin"}
              {item.cuenta_vigente === false && item.activo ? <span className="text-warning-text"> · fuera de vigencia, no puede entrar</span> : null}
            </Dato>
            {String(item.tipo_cuenta || "") === "temporal" ? <Dato etiqueta="Supervisor">{String(item.supervisor_nombre || "Sin supervisor")}</Dato> : null}
            <Dato etiqueta="Último acceso">
              {ultimoAcceso(item)}
              {item.ultimo_acceso ? <span className="text-ink-3"> · {formatearFechaHora(item.ultimo_acceso)}</span> : null}
            </Dato>
            {item.departamento ? <Dato etiqueta="Departamento">{String(item.departamento)}</Dato> : null}
            {!item.tiene_password ? <Dato etiqueta="Contraseña">Todavía no tiene contraseña para entrar</Dato> : Number(item.debe_cambiar_password) ? <Dato etiqueta="Contraseña">Debe elegir una nueva al entrar</Dato> : null}
            {item.creado_en ? <Dato etiqueta="Alta">{formatearFecha(item.creado_en)}</Dato> : null}
          </dl>
        </div>
      ) : null}

      {pestana === "roles" ? (
        <ValidacionAmbito v={vRevocar}>
          <div className="flex flex-col gap-3">
            {!detalle ? (
              <Skeleton className="h-20 w-full" />
            ) : actuales.length ? (
              <ul className="flex flex-col divide-y divide-line rounded-[14px] ring-1 ring-line" aria-label="Roles vigentes">
                {actuales.map((a) => (
                  <FilaRol key={String(a.id)} a={a} onRevocar={canAdmin && !esPropia ? () => revocar(a) : undefined} />
                ))}
              </ul>
            ) : (
              <p className="text-[13.5px] text-ink-3">No tiene roles vigentes: puede entrar, pero no ve nada.</p>
            )}
            {canAdmin && esPropia ? <p className="text-[13px] text-ink-3">Nadie puede asignarse ni quitarse roles a sí mismo: pídelo a otra persona que administre usuarios.</p> : null}
            {canAdmin && !esPropia ? (
              <div>
                <Button size="sm" icon={<Plus size={14} weight="bold" />} onClick={() => setAsignar(true)}>
                  Asignar rol
                </Button>
              </div>
            ) : null}
            {anteriores.length ? (
              <div className="flex flex-col gap-2">
                <button type="button" onClick={() => setVerAnteriores((v) => !v)} aria-expanded={verAnteriores} className="press w-fit rounded-full px-2 py-1 text-[12.5px] font-medium text-brand hover:bg-brand-faint">
                  {verAnteriores ? "Ocultar roles anteriores" : `Ver roles anteriores (${anteriores.length})`}
                </button>
                {verAnteriores ? (
                  <ul className="flex flex-col divide-y divide-line rounded-[14px] ring-1 ring-line" aria-label="Roles anteriores">
                    {anteriores.map((a) => (
                      <FilaRol key={String(a.id)} a={a} />
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
          {asignar ? <AsignarRolDialog usuarioId={Number(base.id)} nombre={String(item.nombre || item.email || "")} onCerrar={() => setAsignar(false)} onListo={cargar} /> : null}
        </ValidacionAmbito>
      ) : null}

      {pestana === "autorizaciones" ? <AutorizacionesUsuario usuarioId={Number(base.id)} /> : null}
    </div>
  );
}

function FilaRol({ a, onRevocar }: { a: ApiRecord; onRevocar?: () => void }) {
  const estado = ESTADO_ASIGNACION[String(a.estado)] || ESTADO_ASIGNACION.vigente;
  return (
    <li className="flex flex-wrap items-start gap-3 px-3.5 py-3" data-asignacion={String(a.id)}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-ink">{String(a.rol || "Rol")}</span>
          <Badge tone={estado.tone} dot>
            {estado.label}
          </Badge>
        </div>
        <span className="text-[13px] text-ink-3">
          Desde el {formatearFecha(a.vigente_desde)}
          {a.vigente_hasta ? ` hasta el ${formatearFecha(a.vigente_hasta)}` : ", sin fecha de fin"}
          {a.asignado_por_nombre ? ` · lo asignó ${String(a.asignado_por_nombre)}` : ""}
        </span>
        {a.revocado_en ? (
          <span className="text-[13px] text-danger">
            Revocado el {formatearFecha(a.revocado_en)}
            {a.revocado_por_nombre ? ` por ${String(a.revocado_por_nombre)}` : ""}
            {a.motivo_revocacion ? `: ${String(a.motivo_revocacion)}` : ""}
          </span>
        ) : null}
      </div>
      {onRevocar ? (
        <Button size="sm" variant="secondary" icon={<Prohibit size={14} />} onClick={onRevocar}>
          Revocar
        </Button>
      ) : null}
    </li>
  );
}

/* Asignar rol: los mismos datos de siempre (rol, vigencia, motivo y contraseña); la aprueba un segundo usuario. */
function AsignarRolDialog({ usuarioId, nombre, onCerrar, onListo }: { usuarioId: number; nombre: string; onCerrar: () => void; onListo: () => Promise<void> }) {
  const { token } = useSession();
  const [roles, setRoles] = useState<ApiRecord[]>([]);
  const [nueva, setNueva] = useState({ rol_id: "", desde: hoyLocal(), hasta: "", motivo: "" });
  const [clave, setClave] = useState("");
  const [guardando, setGuardando] = useState(false);
  useEffect(() => {
    getJsonAuth(`${API_BASE_URL}/admin/roles`, token)
      .then((data) => setRoles(((data.items || []) as ApiRecord[]).filter((role) => !!role.activo)))
      .catch(() => setRoles([]));
  }, [token]);
  const v = useValidacion({
    titulo: "No se pudo asignar el rol",
    reglas: () => {
      const out: Problema[] = [];
      if (!nueva.rol_id) out.push({ campo: "u-asignar-rol", mensaje: msg.elige("el rol a asignar") });
      if (nueva.motivo.trim().length < 5) out.push({ campo: "u-asignar-motivo", mensaje: msg.minimo("El motivo de la asignación", 5) });
      return out;
    },
  });
  const asignar = async () => {
    if (!v.validar()) return;
    armarReauth(clave ? { password: clave } : null);
    setGuardando(true);
    try {
      const data = await sendJsonAuth("POST", `${API_BASE_URL}/admin/usuarios/${usuarioId}/roles`, token, { rol_id: Number(nueva.rol_id), vigente_desde: nueva.desde || null, vigente_hasta: nueva.hasta || null, motivo: nueva.motivo.trim() });
      // La asignacion queda pendiente de la autorizacion de un segundo usuario.
      if (data.solicitud) toast.info("La asignación quedó pendiente de que otra persona autorizada la apruebe", { duration: 8000 });
      else toast.success("Rol asignado");
      await onListo();
      invalidate("usuarios", "roles", "solicitudes");
      onCerrar();
    } catch (err) {
      v.errorServidor(err, { motivo: "u-asignar-motivo", password: "u-clave-asignar" });
    } finally {
      setGuardando(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onCerrar()}
      title={`Asignar rol a ${nombre}`}
      description="Se revisa que no quede una combinación de roles prohibida y la aprueba otra persona autorizada. Queda en la bitácora con su motivo."
      footer={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button icon={<Plus size={14} weight="bold" />} loading={guardando} onClick={asignar}>
            Asignar rol
          </Button>
        </>
      }
    >
      <ValidacionAmbito v={v}>
        <FormGrid>
          <Field label="Rol" htmlFor="u-asignar-rol" required>
            <Select id="u-asignar-rol" value={nueva.rol_id} onChange={(event) => setNueva((prev) => ({ ...prev, rol_id: event.target.value }))}>
              <option value="">Seleccionar rol</option>
              {roles.map((role) => (
                <option key={String(role.id)} value={String(role.id)}>
                  {String(role.nombre)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Motivo" htmlFor="u-asignar-motivo" required>
            <Textarea id="u-asignar-motivo" rows={2} maxLength={300} value={nueva.motivo} onChange={(event) => setNueva((prev) => ({ ...prev, motivo: event.target.value }))} placeholder="Ej. Cambio de funciones" />
          </Field>
          <Field label="Vigente desde" htmlFor="u-asignar-desde">
            <DateInput id="u-asignar-desde" value={nueva.desde} onChange={(value) => setNueva((prev) => ({ ...prev, desde: value }))} />
          </Field>
          <Field label="Vigente hasta" htmlFor="u-asignar-hasta" hint="Opcional">
            <DateInput id="u-asignar-hasta" value={nueva.hasta} onChange={(value) => setNueva((prev) => ({ ...prev, hasta: value }))} />
          </Field>
        </FormGrid>
        <div className="mt-4">
          <CampoIdentidad value={clave} onChange={setClave} id="u-clave-asignar" />
        </div>
      </ValidacionAmbito>
    </Dialog>
  );
}
