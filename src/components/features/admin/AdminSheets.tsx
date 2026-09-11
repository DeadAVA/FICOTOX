"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { useSession } from "@/components/session/SessionProvider";
import { AvatarPicker } from "@/components/ui/AvatarPicker";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, FormGrid, Input, Select, Switch, Textarea } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Overlay";
import { HIDDEN_MODULES } from "@/lib/shared/features";
import { API_BASE_URL, getJsonAuth, sendJsonAuth } from "@/lib/client/api";
import { invalidate } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";

/* ---------- Roles ---------- */

const FLAGS = [
  { key: "can_read", label: "Leer" },
  { key: "can_create", label: "Crear" },
  { key: "can_update", label: "Editar" },
  { key: "can_delete", label: "Eliminar" },
] as const;
type FlagKey = (typeof FLAGS)[number]["key"];

export interface PermissionRow {
  permiso_id: number;
  /* Clave del módulo (reactivos, muestras, documentos...). */
  clave: string;
  nombre: string;
  descripcion: string;
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
}

export const toPermissionRows = (items: ApiRecord[]): PermissionRow[] =>
  items.map((perm) => ({
    permiso_id: Number(perm.permiso_id || perm.id),
    clave: String(perm.clave || perm.permiso_clave || ""),
    nombre: String(perm.nombre || ""),
    descripcion: String(perm.descripcion || ""),
    can_read: !!perm.can_read,
    can_create: !!perm.can_create,
    can_update: !!perm.can_update,
    can_delete: !!perm.can_delete,
  }));

const fullRow = (row: PermissionRow) => FLAGS.every((flag) => row[flag.key]);

export function RoleSheet({ open, role, initialPermissions, onClose }: { open: boolean; role: ApiRecord | null; initialPermissions: PermissionRow[]; onClose: () => void }) {
  const { token, can } = useSession();
  const [nombre, setNombre] = useState(String(role?.nombre || ""));
  const [descripcion, setDescripcion] = useState(String(role?.descripcion || ""));
  const [activo, setActivo] = useState(role ? !!role.activo : true);
  const [rows, setRows] = useState<PermissionRow[]>(initialPermissions);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = !!role?.id;

  const fullCount = rows.filter(fullRow).length;
  const allChecked = rows.length > 0 && fullCount === rows.length;
  const someChecked = fullCount > 0 && fullCount < rows.length;

  const setRowFlag = (id: number, flag: FlagKey, checked: boolean) => setRows((prev) => prev.map((row) => (row.permiso_id === id ? { ...row, [flag]: checked } : row)));
  const setRowAll = (id: number, checked: boolean) => setRows((prev) => prev.map((row) => (row.permiso_id === id ? { ...row, can_read: checked, can_create: checked, can_update: checked, can_delete: checked } : row)));
  const setAll = (checked: boolean) => setRows((prev) => prev.map((row) => ({ ...row, can_read: checked, can_create: checked, can_update: checked, can_delete: checked })));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      activo,
      permissions: rows.map((row) => ({ permiso_id: row.permiso_id, can_read: row.can_read, can_create: row.can_create, can_update: row.can_update, can_delete: row.can_delete })),
    };
    if (!payload.nombre) {
      setError("El nombre del rol es obligatorio");
      return;
    }
    if (!can("roles", editing ? "update" : "create")) {
      setError("No tienes permiso para esta acción");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (editing) {
        await sendJsonAuth("PUT", `${API_BASE_URL}/admin/roles/${role!.id}`, token, payload);
        toast.success("Rol actualizado");
      } else {
        await sendJsonAuth("POST", `${API_BASE_URL}/admin/roles`, token, payload);
        toast.success("Rol creado");
      }
      invalidate("roles", "usuarios");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el rol");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => !value && onClose()}
      title={editing ? "Editar rol" : "Nuevo rol"}
      description="Define qué puede ver y hacer cada módulo."
      size="lg"
      footer={
        <>
          {error ? <p className="mr-auto text-[13px] text-danger">{error}</p> : null}
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="role-form" loading={submitting}>
            {editing ? "Guardar cambios" : "Crear rol"}
          </Button>
        </>
      }
    >
      <form id="role-form" onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        <FormGrid>
          <Field label="Nombre" htmlFor="role-nombre" required className="sm:col-span-2">
            <Input id="role-nombre" maxLength={50} value={nombre} onChange={(event) => setNombre(event.target.value)} autoFocus={!editing} invalid={!!error && !nombre.trim()} />
          </Field>
          <Field label="Descripción" htmlFor="role-descripcion" className="sm:col-span-2">
            <Textarea id="role-descripcion" rows={2} value={descripcion} onChange={(event) => setDescripcion(event.target.value)} />
          </Field>
        </FormGrid>
        <Switch checked={activo} onCheckedChange={setActivo} label="Rol activo" description="Los usuarios con un rol inactivo no pueden entrar." />

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[15px] font-semibold text-ink">Permisos por módulo</h3>
            <Checkbox
              label="Seleccionar todo"
              checked={allChecked}
              disabled={!rows.length}
              ref={(el) => {
                if (el) el.indeterminate = someChecked;
              }}
              onChange={(event) => setAll(event.target.checked)}
            />
          </div>
          <div className="overflow-hidden rounded-card border border-line">
            <table className="w-full text-[13px]">
              <thead className="bg-surface-2/70 text-[12px] text-ink-3">
                <tr>
                  <th className="h-9 px-3 text-left font-medium">Módulo</th>
                  {FLAGS.map((flag) => (
                    <th key={flag.key} className="h-9 w-16 px-2 text-center font-medium">
                      {flag.label}
                    </th>
                  ))}
                  <th className="h-9 w-16 px-2 text-center font-medium">Todo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {/* Los módulos apagados (ver features.ts) no se muestran; sus permisos guardados viajan intactos al guardar. */}
                {rows.filter((row) => !HIDDEN_MODULES.has(String(row.clave || ""))).map((row) => (
                  <tr key={row.permiso_id} className="hover:bg-surface-2/40">
                    <td className="px-3 py-2">
                      <div className="font-medium text-ink">{row.nombre}</div>
                      {row.descripcion ? <div className="text-[12px] text-ink-3">{row.descripcion}</div> : null}
                    </td>
                    {FLAGS.map((flag) => (
                      <td key={flag.key} className="px-2 text-center">
                        <Checkbox className="inline-flex" aria-label={`${flag.label} en ${row.nombre}`} checked={row[flag.key]} onChange={(event) => setRowFlag(row.permiso_id, flag.key, event.target.checked)} />
                      </td>
                    ))}
                    <td className="px-2 text-center">
                      <Checkbox className="inline-flex" aria-label={`Todo en ${row.nombre}`} checked={fullRow(row)} onChange={(event) => setRowAll(row.permiso_id, event.target.checked)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </form>
    </Sheet>
  );
}

/* ---------- Usuarios ---------- */

export function UserSheet({ open, item, onClose }: { open: boolean; item: ApiRecord | null; onClose: () => void }) {
  const { token, can, authConfig } = useSession();
  const [roles, setRoles] = useState<ApiRecord[]>([]);
  const [nombre, setNombre] = useState(String(item?.nombre || ""));
  const [email, setEmail] = useState(String(item?.email || ""));
  const [roleId, setRoleId] = useState(item?.id_rol ? String(item.id_rol) : "");
  const [departamento, setDepartamento] = useState(String(item?.departamento || ""));
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activo, setActivo] = useState(item ? !!item.activo : true);
  const [avatar, setAvatar] = useState<string | null>(item?.avatar ? String(item.avatar) : null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = !!item?.id;

  useEffect(() => {
    if (!open || !token) return;
    getJsonAuth(`${API_BASE_URL}/admin/roles`, token)
      .then((data) => setRoles(((data.items || []) as ApiRecord[]).filter((role) => !!role.activo)))
      .catch(() => setRoles([]));
  }, [open, token]);

  const allowedDomain = authConfig.microsoft?.allowedDomain || "cicese.mx";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const payload: Record<string, unknown> = {
      nombre: nombre.trim(),
      email: email.trim(),
      id_rol: Number(roleId || 0),
      departamento: departamento.trim() || null,
      ...(avatar ? { avatar } : {}),
      activo,
    };
    if (password) payload.password = password;
    if (!payload.email) {
      setError("El correo es obligatorio");
      return;
    }
    if (!String(payload.email).toLowerCase().endsWith(`@${allowedDomain}`)) {
      setError(`Solo se aceptan correos @${allowedDomain}`);
      return;
    }
    if (!payload.id_rol) {
      setError("Selecciona un rol");
      return;
    }
    if (!editing && !password) {
      setError("Define una contraseña inicial");
      return;
    }
    if (password && password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (!can("usuarios", editing ? "update" : "create")) {
      setError("No tienes permiso para esta acción");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (editing) {
        await sendJsonAuth("PUT", `${API_BASE_URL}/admin/usuarios/${item!.id}`, token, payload);
        toast.success("Usuario actualizado");
      } else {
        await sendJsonAuth("POST", `${API_BASE_URL}/admin/usuarios`, token, payload);
        toast.success("Usuario creado");
      }
      invalidate("usuarios", "roles");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el usuario");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => !value && onClose()}
      title={editing ? "Editar usuario" : "Nuevo usuario"}
      description="Acceso con correo institucional y permisos según su rol."
      footer={
        <>
          {error ? <p className="mr-auto text-[13px] text-danger">{error}</p> : null}
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="user-form" loading={submitting}>
            {editing ? "Guardar cambios" : "Crear usuario"}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <FormGrid>
          <Field label="Nombre" htmlFor="u-nombre">
            <Input id="u-nombre" maxLength={100} value={nombre} onChange={(event) => setNombre(event.target.value)} autoFocus={!editing} />
          </Field>
          <Field label="Correo" htmlFor="u-email" required hint={`Debe ser @${allowedDomain}`}>
            <Input id="u-email" type="email" maxLength={100} value={email} onChange={(event) => setEmail(event.target.value)} invalid={!!error && !email.trim()} />
          </Field>
          <Field label="Rol" htmlFor="u-rol" required>
            <Select id="u-rol" value={roles.some((role) => String(role.id) === roleId) ? roleId : ""} onChange={(event) => setRoleId(event.target.value)} invalid={!!error && !roleId}>
              <option value="">Seleccionar rol</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Departamento" htmlFor="u-depto">
            <Input id="u-depto" maxLength={100} value={departamento} onChange={(event) => setDepartamento(event.target.value)} />
          </Field>
          <Field label="Avatar" hint={editing ? "La persona también puede cambiarlo desde Mi cuenta." : "Si no eliges uno, se asigna al azar."} className="sm:col-span-2">
            <AvatarPicker value={avatar} seed={email.trim().toLowerCase() || nombre.toLowerCase()} onChange={setAvatar} size={44} />
          </Field>
          <Field label={editing ? "Nueva contraseña" : "Contraseña"} htmlFor="u-password" required={!editing} hint={editing ? "Déjala vacía para conservar la actual." : "Mínimo 8 caracteres."} className="sm:col-span-2">
            <Input
              id="u-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              trailing={
                <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} className="rounded-full p-1 text-ink-3 hover:bg-surface-2 hover:text-ink">
                  {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              }
            />
          </Field>
        </FormGrid>
        <Switch checked={activo} onCheckedChange={setActivo} label="Usuario activo" description="Un usuario inactivo conserva su historial pero no puede entrar." />
      </form>
    </Sheet>
  );
}
