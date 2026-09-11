"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { LockKey, PencilSimple, Plus, ShieldCheck, Trash } from "@phosphor-icons/react";
import { RoleSheet, toPermissionRows, type PermissionRow } from "@/components/features/admin/AdminSheets";
import { PageBody } from "@/components/shell/AppShell";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { ActionMenu, Tooltip, useConfirm, type MenuItem } from "@/components/ui/Overlay";
import { PageHeader, SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { Badge, EmptyState, ErrorState, TableSkeleton } from "@/components/ui/Primitives";
import { CellPrimary, Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, getJsonAuth, resolveApiEntity, sendJsonAuth } from "@/lib/client/api";
import { fmt, normalizeText } from "@/lib/client/format";
import { invalidate, useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";

export default function RolesPage() {
  return (
    <PageBody>
      <PageHeader title="Roles" description="Permisos por módulo. Un permiso ausente significa no concedido." />
      <RequireModule modules="roles">
        <RolesContent />
      </RequireModule>
    </PageBody>
  );
}

function RolesContent() {
  const { token, can } = useSession();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const [sheet, setSheet] = useState<{ open: boolean; key: number; role: ApiRecord | null; permissions: PermissionRow[] }>({ open: false, key: 0, role: null, permissions: [] });

  const resource = useResource<{ roles: ApiRecord[]; catalog: ApiRecord[] }>(
    "roles",
    async () => {
      const [roles, permissions] = await Promise.all([getJsonAuth(`${API_BASE_URL}/admin/roles`, token), getJsonAuth(`${API_BASE_URL}/admin/permissions`, token)]);
      return {
        roles: (roles.items || []) as ApiRecord[],
        catalog: ((permissions.items || []) as ApiRecord[]).map((p) => ({ ...p, permiso_id: p.id, can_read: false, can_create: false, can_update: false, can_delete: false })),
      };
    },
    { enabled: !!token },
  );

  const roles = resource.data?.roles || [];
  const rows = useMemo(() => {
    const term = normalizeText(search);
    return term ? roles.filter((role) => normalizeText(`${role.nombre || ""} ${role.descripcion || ""}`).includes(term)) : roles;
  }, [roles, search]);

  const openCreate = () => setSheet((prev) => ({ open: true, key: prev.key + 1, role: null, permissions: toPermissionRows(resource.data?.catalog || []) }));

  const editRole = async (id: number) => {
    try {
      const data = await getJsonAuth(`${API_BASE_URL}/admin/roles/${id}`, token);
      const role = resolveApiEntity(data, ["role"]);
      const permissions = (data.permissions || role.permissions || resource.data?.catalog || []) as ApiRecord[];
      setSheet((prev) => ({ open: true, key: prev.key + 1, role, permissions: toPermissionRows(permissions) }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar el rol");
    }
  };

  const deleteRole = async (role: ApiRecord) => {
    const ok = await confirm({ title: "Eliminar rol", description: `Se eliminará el rol "${role.nombre}". Solo es posible si ningún usuario lo tiene asignado.`, confirmLabel: "Eliminar", tone: "danger" });
    if (!ok) return;
    try {
      await sendJsonAuth("DELETE", `${API_BASE_URL}/admin/roles/${role.id}`, token);
      toast.success("Rol eliminado");
      invalidate("roles", "usuarios");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  };

  const canCreate = can("roles", "create");
  const canUpdate = can("roles", "update");
  const canDelete = can("roles", "delete");

  const menuFor = (role: ApiRecord): MenuItem[] => {
    const list: MenuItem[] = [];
    if (canUpdate) list.push({ label: "Editar", description: "Nombre, descripción y permisos por módulo", icon: <PencilSimple size={16} weight="duotone" />, tone: "brand", onSelect: () => editRole(Number(role.id)) });
    if (canDelete && !role.es_sistemico) list.push({ label: "Eliminar rol", description: Number(role.total_usuarios || 0) > 0 ? "Solo si no tiene usuarios asignados" : "Queda en la bitácora", icon: <Trash size={16} weight="duotone" />, tone: "danger", disabled: Number(role.total_usuarios || 0) > 0, separatorBefore: list.length > 0, onSelect: () => deleteRole(role) });
    return list;
  };

  return (
    <>
      <p className="tnum -mt-2 text-[12.5px] text-ink-3">
        <span className="font-medium text-ink">{fmt(roles.length)}</span> roles · <span className="font-medium text-ink">{fmt(roles.filter((r) => !!r.activo).length)}</span> activos · <span className="font-medium text-ink">{fmt(roles.filter((r) => !!r.es_sistemico).length)}</span> del sistema ·{" "}
        <span className="font-medium text-ink">{fmt(roles.reduce((acc, r) => acc + Number(r.total_usuarios || 0), 0))}</span> usuarios asignados
      </p>

      <Toolbar
        end={
          canCreate ? (
            <Button icon={<Plus size={16} weight="bold" />} onClick={openCreate}>
              Nuevo rol
            </Button>
          ) : null
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar rol" className="w-full md:w-[320px]" />
      </Toolbar>

      <TableShell footer={resource.data ? `${fmt(rows.length)} roles` : undefined}>
        {resource.error ? (
          <ErrorState message={resource.error} onRetry={resource.reload} />
        ) : !resource.data ? (
          <TableSkeleton cols={5} />
        ) : !rows.length ? (
          <EmptyState icon={<ShieldCheck size={20} />} title="Sin roles" description="Crea roles para definir permisos por módulo." />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Rol</Th>
                <Th align="right">Usuarios</Th>
                <Th>Estado</Th>
                <Th>Tipo</Th>
                <Th align="right" sticky />
              </tr>
            </THead>
            <TBody>
              {rows.map((role) => (
                <Tr key={role.id}>
                  <Td className="max-w-[420px]">
                    <div className="flex items-center gap-2">
                      <CellPrimary title={role.nombre || "-"} subtitle={role.descripcion || undefined} />
                      {role.es_sistemico ? (
                        <Tooltip content="Rol del sistema">
                          <span className="text-ink-4">
                            <LockKey size={14} />
                          </span>
                        </Tooltip>
                      ) : null}
                    </div>
                  </Td>
                  <Td align="right">{fmt(role.total_usuarios || 0)}</Td>
                  <Td>
                    <Badge tone={role.activo ? "success" : "neutral"} dot>
                      {role.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </Td>
                  <Td muted>{role.es_sistemico ? "Del sistema" : "Personalizado"}</Td>
                  <Td align="right" sticky onClick={(event) => event.stopPropagation()}>
                    <ActionMenu items={menuFor(role)} header={String(role.nombre || "")} />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </TableShell>

      {sheet.key ? <RoleSheet key={`sheet-${sheet.key}`} open={sheet.open} role={sheet.role} initialPermissions={sheet.permissions} onClose={() => setSheet((prev) => ({ ...prev, open: false }))} /> : null}
    </>
  );
}
