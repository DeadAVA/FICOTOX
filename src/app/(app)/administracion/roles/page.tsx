"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, LockKey, PencilSimple, Plus, ShieldCheck, Trash } from "@phosphor-icons/react";
import { RoleSheet } from "@/components/features/admin/AdminSheets";
import { PageBody } from "@/components/shell/AppShell";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { ActionMenu, Tooltip, useConfirm, type MenuItem } from "@/components/ui/Overlay";
import { PageHeader, SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { Badge, EmptyState, ErrorState, TableSkeleton } from "@/components/ui/Primitives";
import { CellPrimary, Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, getJsonAuth, sendJsonAuth } from "@/lib/client/api";
import { resumenPermisos } from "@/lib/client/audit-humanize";
import { fmt, normalizeText } from "@/lib/client/format";
import { invalidate, useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import type { PermisoFila } from "@/lib/shared/permisos";

export default function RolesPage() {
  return (
    <PageBody>
      <PageHeader title="Roles" description="Matriz de permisos por módulo, acción y alcance. Lo que no se marca, no se concede." />
      <RequireModule modules="usuarios">
        <RolesGuard />
      </RequireModule>
    </PageBody>
  );
}

/* Con alcance "propio" en usuarios la persona solo ve su cuenta: el catalogo de roles no le corresponde. */
function RolesGuard() {
  const { alcance } = useSession();
  if (alcance("usuarios", "V") === "propio") {
    return <EmptyState icon={<LockKey size={20} />} title="Sin acceso a esta sección" description="Tu alcance en usuarios es solo tu propia cuenta." />;
  }
  return <RolesContent />;
}

function RolesContent() {
  const { token, can, roles: rolesSesion } = useSession();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const [sheet, setSheet] = useState<{ open: boolean; key: number; role: ApiRecord | null; permisos: PermisoFila[]; usuarios: ApiRecord[] }>({ open: false, key: 0, role: null, permisos: [], usuarios: [] });

  const resource = useResource<ApiRecord[]>(
    "roles",
    async () => {
      const data = await getJsonAuth(`${API_BASE_URL}/admin/roles`, token);
      return (data.items || []) as ApiRecord[];
    },
    { enabled: !!token },
  );

  const roles = resource.data || [];
  const rows = useMemo(() => {
    const term = normalizeText(search);
    return term ? roles.filter((role) => normalizeText(`${role.nombre || ""} ${role.descripcion || ""}`).includes(term)) : roles;
  }, [roles, search]);

  const openCreate = () => setSheet((prev) => ({ open: true, key: prev.key + 1, role: null, permisos: [], usuarios: [] }));

  const openRole = async (id: number) => {
    try {
      const data = await getJsonAuth(`${API_BASE_URL}/admin/roles/${id}`, token);
      setSheet((prev) => ({ open: true, key: prev.key + 1, role: (data.role || {}) as ApiRecord, permisos: (data.permisos || []) as PermisoFila[], usuarios: (data.usuarios || []) as ApiRecord[] }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar el rol");
    }
  };

  const deleteRole = async (role: ApiRecord) => {
    const ok = await confirm({ title: "Eliminar rol", description: `Se eliminará el rol "${role.nombre}". Solo es posible si nunca se asignó a nadie; si ya se usó, desactívalo.`, confirmLabel: "Eliminar", tone: "danger" });
    if (!ok) return;
    try {
      await sendJsonAuth("DELETE", `${API_BASE_URL}/admin/roles/${role.id}`, token);
      toast.success("Rol eliminado");
      invalidate("roles", "usuarios");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  };

  const canAdmin = can("usuarios", "G");

  const menuFor = (role: ApiRecord): MenuItem[] => {
    const list: MenuItem[] = [];
    const propio = rolesSesion.some((rol) => Number(rol.id) === Number(role.id));
    if (canAdmin && propio) list.push({ label: "Ver permisos", description: "No puedes editar un rol que tienes asignado", icon: <Eye size={16} weight="duotone" />, tone: "brand", onSelect: () => openRole(Number(role.id)) });
    else if (canAdmin) list.push({ label: "Editar", description: "Nombre, descripción y matriz de permisos", icon: <PencilSimple size={16} weight="duotone" />, tone: "brand", onSelect: () => openRole(Number(role.id)) });
    else list.push({ label: "Ver permisos", description: "Matriz de permisos y personas con el rol", icon: <Eye size={16} weight="duotone" />, tone: "brand", onSelect: () => openRole(Number(role.id)) });
    if (canAdmin && !role.es_sistemico) list.push({ label: "Eliminar rol", description: Number(role.total_usuarios || 0) > 0 ? "Solo si nunca se asignó" : "Queda en la bitácora", icon: <Trash size={16} weight="duotone" />, tone: "danger", disabled: Number(role.total_usuarios || 0) > 0, separatorBefore: list.length > 0, onSelect: () => deleteRole(role) });
    return list;
  };

  return (
    <>
      <p className="tnum -mt-2 text-[12.5px] text-ink-3">
        <span className="font-medium text-ink">{fmt(roles.length)}</span> roles · <span className="font-medium text-ink">{fmt(roles.filter((r) => !!r.activo).length)}</span> activos · <span className="font-medium text-ink">{fmt(roles.filter((r) => !!r.es_sistemico).length)}</span> del sistema ·{" "}
        <span className="font-medium text-ink">{fmt(roles.reduce((acc, r) => acc + Number(r.total_usuarios || 0), 0))}</span> asignaciones vigentes
      </p>

      <Toolbar
        end={
          canAdmin ? (
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
          <EmptyState icon={<ShieldCheck size={20} />} title="Sin roles" description="Crea roles para definir permisos por módulo y acción." />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Rol</Th>
                <Th>Permisos</Th>
                <Th align="right">Personas</Th>
                <Th>Estado</Th>
                <Th>Tipo</Th>
                <Th align="right" sticky />
              </tr>
            </THead>
            <TBody>
              {rows.map((role) => (
                <Tr key={role.id} onClick={() => openRole(Number(role.id))} className="cursor-pointer">
                  <Td className="max-w-[320px]">
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
                  <Td className="max-w-[520px]">
                    <div className="flex flex-wrap gap-1">
                      {[...resumenPermisos(role.permisos).entries()].map(([modulo, texto]) => (
                        <Badge key={modulo} tone="neutral">
                          {modulo}: {texto}
                        </Badge>
                      ))}
                      {!(role.permisos || []).length ? <span className="text-[12.5px] text-ink-4">Sin permisos</span> : null}
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

      {sheet.key ? <RoleSheet key={`sheet-${sheet.key}`} open={sheet.open} role={sheet.role} initialPermisos={sheet.permisos} usuarios={sheet.usuarios} readOnly={!canAdmin} onClose={() => setSheet((prev) => ({ ...prev, open: false }))} /> : null}
    </>
  );
}
