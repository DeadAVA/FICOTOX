"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DotsThree, PencilSimple, Plus, Trash, Users } from "@phosphor-icons/react";
import { UserSheet } from "@/components/features/admin/AdminSheets";
import { PageBody } from "@/components/shell/AppShell";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button, IconButton } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { Dropdown, useConfirm } from "@/components/ui/Overlay";
import { LinkTabs, PageHeader, SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { Avatar, Badge, EmptyState, ErrorState, Stat, TableSkeleton } from "@/components/ui/Primitives";
import { RowActions, Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, getJsonAuth, resolveApiEntity, sendJsonAuth } from "@/lib/client/api";
import { fmt, fmtDate, normalizeText } from "@/lib/client/format";
import { useOpenState } from "@/lib/client/hooks";
import { ADMIN_NAV } from "@/lib/client/nav";
import { invalidate, useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";

export default function UsuariosPage() {
  const { can } = useSession();
  return (
    <PageBody>
      <PageHeader title="Administración" description="Cuentas de acceso y permisos del sistema." />
      <LinkTabs items={ADMIN_NAV.filter((item) => item.modules.some((m) => can(m))).map((item) => ({ href: item.href, label: item.label }))} />
      <RequireModule modules="usuarios">
        <UsuariosContent />
      </RequireModule>
    </PageBody>
  );
}

function UsuariosContent() {
  const { token, can, user: me } = useSession();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const modal = useOpenState<ApiRecord>();

  const resource = useResource<ApiRecord[]>(
    "usuarios",
    async () => {
      const data = await getJsonAuth(`${API_BASE_URL}/admin/usuarios`, token);
      return (data.items || []) as ApiRecord[];
    },
    { enabled: !!token },
  );
  const items = resource.data;

  const roles = useMemo(() => Array.from(new Set((items || []).map((item) => String(item.rol || "")).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [items]);
  const rows = useMemo(() => {
    const term = normalizeText(search);
    return (items || []).filter((item) => (!term || normalizeText(`${item.nombre || ""} ${item.email || ""}`).includes(term)) && (!roleFilter || item.rol === roleFilter));
  }, [items, search, roleFilter]);

  const editUser = async (id: number) => {
    try {
      const data = await getJsonAuth(`${API_BASE_URL}/admin/usuarios/${id}`, token);
      modal.open(resolveApiEntity(data));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar el usuario");
    }
  };

  const deleteUser = async (item: ApiRecord) => {
    const ok = await confirm({ title: "Eliminar usuario", description: `Se eliminará la cuenta de ${item.email}. Si solo quieres bloquear el acceso, márcala como inactiva.`, confirmLabel: "Eliminar", tone: "danger" });
    if (!ok) return;
    try {
      await sendJsonAuth("DELETE", `${API_BASE_URL}/admin/usuarios/${item.id}`, token);
      toast.success("Usuario eliminado");
      invalidate("usuarios", "roles");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  };

  const list = items || [];
  const canCreate = can("usuarios", "create");
  const canUpdate = can("usuarios", "update");
  const canDelete = can("usuarios", "delete");

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Usuarios" value={fmt(list.length)} />
        <Stat label="Activos" value={fmt(list.filter((item) => !!item.activo).length)} tone="success" />
        <Stat label="Inactivos" value={fmt(list.filter((item) => !item.activo).length)} />
        <Stat label="Sin contraseña" value={fmt(list.filter((item) => !item.tiene_password).length)} tone={list.some((item) => !item.tiene_password) ? "warning" : "neutral"} hint="No pueden entrar con acceso local" />
      </div>

      <Toolbar
        end={
          canCreate ? (
            <Button icon={<Plus size={16} weight="bold" />} onClick={() => modal.open(null)}>
              Nuevo usuario
            </Button>
          ) : null
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre o correo" className="w-full md:w-[320px]" />
        <div className="w-full md:w-[220px]">
          <Select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filtrar por rol">
            <option value="">Todos los roles</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </Select>
        </div>
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
                <Th>Rol</Th>
                <Th>Departamento</Th>
                <Th>Último acceso</Th>
                <Th>Estado</Th>
                <Th align="right" />
              </tr>
            </THead>
            <TBody>
              {rows.map((item) => (
                <Tr key={item.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={item.nombre} email={item.email} />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium text-ink">
                          {item.nombre || "Sin nombre"}
                          {me?.id === item.id ? <span className="ml-1.5 text-[11.5px] font-normal text-ink-3">(tú)</span> : null}
                        </span>
                        <span className="truncate text-[12px] text-ink-3">{item.email}</span>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={normalizeText(item.rol).includes("admin") ? "brand" : "neutral"}>{item.rol || "Sin rol"}</Badge>
                  </Td>
                  <Td muted>{item.departamento || "-"}</Td>
                  <Td muted>{fmtDate(item.ultimo_acceso || item.creado_en)}</Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <Badge tone={item.activo ? "success" : "neutral"} dot>
                        {item.activo ? "Activo" : "Inactivo"}
                      </Badge>
                      {!item.tiene_password ? <Badge tone="warning">Sin contraseña</Badge> : null}
                    </div>
                  </Td>
                  <Td align="right">
                    <RowActions>
                      {canUpdate ? (
                        <IconButton label="Editar" onClick={() => editUser(Number(item.id))}>
                          <PencilSimple size={16} />
                        </IconButton>
                      ) : null}
                      {canDelete && me?.id !== item.id ? (
                        <Dropdown
                          label="Más acciones"
                          trigger={
                            <IconButton label="Más acciones">
                              <DotsThree size={18} weight="bold" />
                            </IconButton>
                          }
                          items={[{ label: "Eliminar usuario", icon: <Trash size={16} />, tone: "danger", onSelect: () => deleteUser(item) }]}
                        />
                      ) : null}
                    </RowActions>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </TableShell>

      {modal.key ? <UserSheet key={`modal-${modal.key}`} open={modal.isOpen} item={modal.payload} onClose={modal.close} /> : null}
    </>
  );
}
