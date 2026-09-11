"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PencilSimple, Plus, Trash, Users } from "@phosphor-icons/react";
import { UserSheet } from "@/components/features/admin/AdminSheets";
import { PageBody } from "@/components/shell/AppShell";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { FilterChips, FilterMenu, type FilterGroup } from "@/components/ui/FilterMenu";
import { ActionMenu, usePrompt, type MenuItem } from "@/components/ui/Overlay";
import { PageHeader, SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { Avatar, Badge, EmptyState, ErrorState, TableSkeleton } from "@/components/ui/Primitives";
import { Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, getJsonAuth, resolveApiEntity, sendJsonAuth } from "@/lib/client/api";
import { fmt, fmtDate, normalizeText } from "@/lib/client/format";
import { useOpenState } from "@/lib/client/hooks";
import { invalidate, useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";

export default function UsuariosPage() {
  return (
    <PageBody>
      <PageHeader title="Usuarios" description="Cuentas de acceso al sistema. Las cuentas no se eliminan: se dan de baja con motivo." />
      <RequireModule modules="usuarios">
        <UsuariosContent />
      </RequireModule>
    </PageBody>
  );
}

function UsuariosContent() {
  const { token, can, user: me } = useSession();
  const prompt = usePrompt();
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

  // Las cuentas no se eliminan: se dan de baja (inactivas) con motivo y su historial se conserva.
  const deleteUser = async (item: ApiRecord) => {
    const motivo = await prompt({ title: `Dar de baja a ${item.email}`, description: "La cuenta queda inactiva y no puede entrar; los registros y la bitácora que la citan se conservan.", confirmLabel: "Dar de baja", tone: "danger" });
    if (!motivo) return;
    try {
      await sendJsonAuth("DELETE", `${API_BASE_URL}/admin/usuarios/${item.id}`, token, { motivo });
      toast.success("Usuario dado de baja");
      invalidate("usuarios", "roles");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo dar de baja");
    }
  };

  const list = items || [];
  const canCreate = can("usuarios", "create");
  const canUpdate = can("usuarios", "update");
  const canDelete = can("usuarios", "delete");

  const groups: FilterGroup[] = [
    {
      key: "rol",
      label: "Rol",
      value: roleFilter,
      defaultValue: "",
      onChange: setRoleFilter,
      options: [{ value: "", label: "Todos los roles" }, ...roles.map((role) => ({ value: role, label: role, count: (items || []).filter((u) => u.rol === role).length }))],
    },
  ];

  const menuFor = (item: ApiRecord): MenuItem[] => {
    const list: MenuItem[] = [];
    if (canUpdate) list.push({ label: "Editar", description: "Nombre, rol, departamento, contraseña o avatar", icon: <PencilSimple size={16} weight="duotone" />, tone: "brand", onSelect: () => editUser(Number(item.id)) });
    if (canDelete && me?.id !== item.id) list.push({ label: "Dar de baja…", description: "La cuenta queda inactiva; su historial se conserva", icon: <Trash size={16} weight="duotone" />, tone: "danger", disabled: !item.activo, separatorBefore: list.length > 0, onSelect: () => deleteUser(item) });
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
            <Button icon={<Plus size={16} weight="bold" />} onClick={() => modal.open(null)}>
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
                <Th>Rol</Th>
                <Th>Departamento</Th>
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
                  <Td align="right" sticky onClick={(event) => event.stopPropagation()}>
                    <ActionMenu items={menuFor(item)} header={String(item.email || "")} />
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
