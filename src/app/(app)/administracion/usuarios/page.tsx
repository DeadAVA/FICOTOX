"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Eye, Key, LockOpen, PencilSimple, Plus, Trash, Users } from "@phosphor-icons/react";
import { UserSheet } from "@/components/features/admin/AdminSheets";
import { PageBody } from "@/components/shell/AppShell";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { FilterChips, FilterMenu, type FilterGroup } from "@/components/ui/FilterMenu";
import { ActionMenu, Dialog, usePrompt, type MenuItem } from "@/components/ui/Overlay";
import { PageHeader, SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { Avatar, Badge, EmptyState, ErrorState, TableSkeleton } from "@/components/ui/Primitives";
import { Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, getJsonAuth, resolveApiEntity, sendJsonAuth } from "@/lib/client/api";
import { fmt, fmtDate, fmtDateTime, normalizeText } from "@/lib/client/format";
import { useOpenState } from "@/lib/client/hooks";
import { invalidate, useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { formatearHora } from "@/lib/shared/fechas";

export default function UsuariosPage() {
  return (
    <PageBody>
      <PageHeader title="Usuarios" description="Cuentas de acceso y sus roles con vigencia. Las cuentas no se eliminan: se dan de baja con motivo." />
      <RequireModule modules="usuarios">
        <UsuariosContent />
      </RequireModule>
    </PageBody>
  );
}

function UsuariosContent() {
  const { token, can, user: me, alcance } = useSession();
  const prompt = usePrompt();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const modal = useOpenState<ApiRecord>();
  // Contrasena temporal recien generada: se muestra una sola vez.
  const [temporal, setTemporal] = useState<{ email: string; password: string } | null>(null);

  const resource = useResource<ApiRecord[]>(
    "usuarios",
    async () => {
      const data = await getJsonAuth(`${API_BASE_URL}/admin/usuarios`, token);
      return (data.items || []) as ApiRecord[];
    },
    { enabled: !!token },
  );
  const items = resource.data;

  const rolesDe = (item: ApiRecord): string[] => ((item.roles || []) as ApiRecord[]).map((r) => String(r.nombre || "")).filter(Boolean);
  const roles = useMemo(() => Array.from(new Set((items || []).flatMap((item) => ((item.roles || []) as ApiRecord[]).map((r) => String(r.nombre || ""))).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [items]);
  const rows = useMemo(() => {
    const term = normalizeText(search);
    return (items || []).filter((item) => (!term || normalizeText(`${item.nombre || ""} ${item.email || ""}`).includes(term)) && (!roleFilter || ((item.roles || []) as ApiRecord[]).some((r) => r.nombre === roleFilter)));
  }, [items, search, roleFilter]);

  const [soloLectura, setSoloLectura] = useState(false);
  const editUser = async (id: number, lectura = false) => {
    try {
      const data = await getJsonAuth(`${API_BASE_URL}/admin/usuarios/${id}`, token);
      setSoloLectura(lectura);
      modal.open(resolveApiEntity(data));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar el usuario");
    }
  };

  // Las cuentas no se eliminan: se dan de baja (inactivas) con motivo y su historial se conserva.
  const deleteUser = async (item: ApiRecord) => {
    const motivo = await prompt({ critico: true, title: `Dar de baja a ${item.email}`, description: "La cuenta queda inactiva y no puede entrar; los registros y la bitácora que la citan se conservan.", confirmLabel: "Dar de baja", tone: "danger" });
    if (!motivo) return;
    try {
      await sendJsonAuth("DELETE", `${API_BASE_URL}/admin/usuarios/${item.id}`, token, { motivo });
      toast.success("Usuario dado de baja");
      invalidate("usuarios", "roles");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo dar de baja");
    }
  };

  // Fase 2: levantar un bloqueo por intentos fallidos (motivo y reautenticacion).
  const desbloquear = async (item: ApiRecord) => {
    const motivo = await prompt({ critico: true, title: `Desbloquear a ${item.email}`, description: `La cuenta está bloqueada hasta las ${horaBloqueo(item.bloqueado_hasta)} por intentos fallidos. Confirma que verificaste la identidad de la persona.`, confirmLabel: "Desbloquear" });
    if (!motivo) return;
    try {
      await sendJsonAuth("POST", `${API_BASE_URL}/admin/usuarios/${item.id}/desbloquear`, token, { motivo });
      toast.success("Cuenta desbloqueada");
      invalidate("usuarios");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo desbloquear");
    }
  };

  // Fase 2: contrasena temporal; la persona debe cambiarla al entrar y sus sesiones se cierran.
  const restablecer = async (item: ApiRecord) => {
    const motivo = await prompt({ critico: true, title: `Restablecer la contraseña de ${item.email}`, description: "Se genera una contraseña temporal que la persona deberá cambiar al entrar; sus sesiones abiertas se cierran.", confirmLabel: "Restablecer contraseña", tone: "danger" });
    if (!motivo) return;
    try {
      const data = await sendJsonAuth("POST", `${API_BASE_URL}/admin/usuarios/${item.id}/password`, token, { motivo });
      setTemporal({ email: String(item.email || ""), password: String(data.password_temporal || "") });
      invalidate("usuarios");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo restablecer la contraseña");
    }
  };

  const list = items || [];
  // usuarios:G administra cuentas y roles; con alcance "propio" la lista solo trae la cuenta propia.
  const canAdmin = can("usuarios", "G");
  const propio = alcance("usuarios", "V") === "propio";
  const canCreate = canAdmin && !propio;

  const groups: FilterGroup[] = [
    {
      key: "rol",
      label: "Rol",
      value: roleFilter,
      defaultValue: "",
      onChange: setRoleFilter,
      options: [{ value: "", label: "Todos los roles" }, ...roles.map((role) => ({ value: role, label: role, count: (items || []).filter((u) => rolesDe(u).includes(role)).length }))],
    },
  ];

  const menuFor = (item: ApiRecord): MenuItem[] => {
    const list: MenuItem[] = [];
    if (canAdmin) list.push({ label: "Editar y roles", description: "Datos de acceso; asignar o revocar roles con vigencia", icon: <PencilSimple size={16} weight="duotone" />, tone: "brand", onSelect: () => editUser(Number(item.id)) });
    else list.push({ label: "Ver ficha", description: "Datos de la cuenta y roles con su vigencia", icon: <Eye size={16} weight="duotone" />, tone: "brand", onSelect: () => editUser(Number(item.id), true) });
    if (canAdmin && item.bloqueado_hasta) list.push({ label: "Desbloquear…", description: `Bloqueada hasta las ${horaBloqueo(item.bloqueado_hasta)} por intentos fallidos`, icon: <LockOpen size={16} weight="duotone" />, onSelect: () => desbloquear(item) });
    if (canAdmin && Number(me?.id) !== Number(item.id)) list.push({ label: "Restablecer contraseña…", description: "Contraseña temporal; debe cambiarla al entrar", icon: <Key size={16} weight="duotone" />, disabled: !item.activo, onSelect: () => restablecer(item) });
    if (canAdmin && Number(me?.id) !== Number(item.id)) list.push({ label: "Dar de baja…", description: "La cuenta queda inactiva; su historial se conserva", icon: <Trash size={16} weight="duotone" />, tone: "danger", disabled: !item.activo, separatorBefore: list.length > 0, onSelect: () => deleteUser(item) });
    return list;
  };

  return (
    <>
      <p className="tnum -mt-2 text-[12.5px] text-ink-3">
        <span className="font-medium text-ink">{fmt(list.length)}</span> cuentas · <span className="font-medium text-ink">{fmt(list.filter((item) => !!item.activo).length)}</span> activas · <span className="font-medium text-ink">{fmt(list.filter((item) => !item.activo).length)}</span> inactivas ·{" "}
        <span className={list.some((item) => !item.tiene_password) ? "font-medium text-warning-text" : "font-medium text-ink"}>{fmt(list.filter((item) => !item.tiene_password).length)}</span> sin contraseña local
      </p>

      <Toolbar
        end={
          canCreate ? (
            <Button
              icon={<Plus size={16} weight="bold" />}
              onClick={() => {
                setSoloLectura(false);
                modal.open(null);
              }}
            >
              Nuevo usuario
            </Button>
          ) : null
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre o correo" className="w-full md:w-[340px]" />
        <FilterMenu groups={groups} />
        <FilterChips groups={groups} />
      </Toolbar>

      <TableShell footer={items ? `${fmt(rows.length)} usuarios` : undefined}>
        {resource.error ? (
          <ErrorState message={resource.error} onRetry={resource.reload} />
        ) : !items ? (
          <TableSkeleton cols={5} />
        ) : !rows.length ? (
          <EmptyState icon={<Users size={20} />} title="Sin usuarios" description={search || roleFilter ? "No hay coincidencias con ese filtro." : "Crea la primera cuenta de acceso."} />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Usuario</Th>
                <Th>Roles vigentes</Th>
                <Th>Cuenta</Th>
                <Th>Último acceso</Th>
                <Th>Estado</Th>
                <Th align="right" sticky />
              </tr>
            </THead>
            <TBody>
              {rows.map((item) => (
                <Tr key={item.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={item.nombre} email={item.email} avatar={item.avatar} />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium text-ink">
                          {item.nombre || "Sin nombre"}
                          {Number(me?.id) === Number(item.id) ? <span className="ml-1.5 text-[11.5px] font-normal text-ink-3">(tú)</span> : null}
                        </span>
                        <span className="truncate text-[12px] text-ink-3">{item.email}</span>
                      </div>
                    </div>
                  </Td>
                  <Td className="max-w-[360px]">
                    <div className="flex flex-wrap gap-1">
                      {((item.roles || []) as ApiRecord[]).map((r) => (
                        <Badge key={String(r.id)} tone={normalizeText(r.nombre).includes("admin") ? "brand" : "neutral"}>
                          {r.nombre}
                          {r.vigente_hasta ? ` · hasta ${fmtDate(r.vigente_hasta)}` : ""}
                        </Badge>
                      ))}
                      {!((item.roles || []) as ApiRecord[]).length ? <Badge tone="warning">Sin roles vigentes</Badge> : null}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-0.5 text-[12.5px]">
                      <span className={item.tipo_cuenta === "temporal" ? "font-medium text-ink" : "text-ink-2"}>{item.tipo_cuenta === "temporal" ? "Temporal" : "Permanente"}</span>
                      {item.vigente_desde || item.vigente_hasta ? (
                        <span className="text-ink-3">
                          {item.vigente_desde ? `Desde ${fmtDate(item.vigente_desde)}` : ""}
                          {item.vigente_desde && item.vigente_hasta ? " · " : ""}
                          {item.vigente_hasta ? `hasta ${fmtDate(item.vigente_hasta)}` : ""}
                        </span>
                      ) : null}
                      {item.supervisor_nombre ? <span className="text-ink-3">Supervisa: {item.supervisor_nombre}</span> : null}
                      {item.departamento ? <span className="text-ink-4">{item.departamento}</span> : null}
                    </div>
                  </Td>
                  <Td muted>{fmtDateTime(item.ultimo_acceso || item.creado_en)}</Td>
                  <Td>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={item.activo ? "success" : "neutral"} dot>
                        {item.activo ? "Activo" : "Inactivo"}
                      </Badge>
                      {!item.tiene_password ? <Badge tone="warning">Sin contraseña</Badge> : null}
                      {item.cuenta_vigente === false && item.activo ? <Badge tone="danger">Fuera de vigencia</Badge> : null}
                      {item.bloqueado_hasta ? <Badge tone="danger">Bloqueada hasta {horaBloqueo(item.bloqueado_hasta)}</Badge> : null}
                      {Number(item.debe_cambiar_password) ? <Badge tone="warning">Debe cambiar contraseña</Badge> : null}
                    </div>
                  </Td>
                  <Td align="right" sticky onClick={(event) => event.stopPropagation()}>
                    <ActionMenu items={menuFor(item)} header={String(item.email || "")} />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </TableShell>

      <Dialog
        open={!!temporal}
        onOpenChange={(open) => !open && setTemporal(null)}
        title="Contraseña temporal"
        description={`Entrégala a ${temporal?.email || "la persona"} por un medio seguro. No se volverá a mostrar: al cerrar este aviso ya no podrás verla.`}
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              icon={<Copy size={16} />}
              onClick={() => {
                void navigator.clipboard
                  ?.writeText(temporal?.password || "")
                  .then(() => toast.success("Contraseña copiada"))
                  .catch(() => toast.error("No se pudo copiar"));
              }}
            >
              Copiar
            </Button>
            <Button onClick={() => setTemporal(null)}>Entendido</Button>
          </>
        }
      >
        <p className="rounded-[10px] bg-surface-2 px-3 py-3 text-center font-mono text-[17px] tracking-wide text-ink ring-1 ring-line" data-testid="password-temporal">
          {temporal?.password}
        </p>
        <p className="mt-3 text-[12.5px] text-ink-3">La persona deberá cambiarla al iniciar sesión. El cambio queda en la bitácora sin la contraseña.</p>
      </Dialog>

      {modal.key ? <UserSheet key={`modal-${modal.key}`} open={modal.isOpen} item={modal.payload} readOnly={soloLectura} onClose={modal.close} /> : null}
    </>
  );
}

/* Hora local (HH:MM) hasta la que dura un bloqueo. */
function horaBloqueo(value: unknown): string {
  return formatearHora(value, "-");
}
