"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Eye, EyeSlash, Plus, Prohibit } from "@phosphor-icons/react";
import { Callout, Panel } from "@/components/features/samples/FormLayout";
import { useSession } from "@/components/session/SessionProvider";
import { AvatarPicker } from "@/components/ui/AvatarPicker";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, FormGrid, Input, Select, Switch, Textarea } from "@/components/ui/Field";
import { DateInput } from "@/components/ui/DateInput";
import { Sheet, usePrompt } from "@/components/ui/Overlay";
import { Badge } from "@/components/ui/Primitives";
import { HIDDEN_MODULES } from "@/lib/shared/features";
import { ACCIONES, ACCION_KEYS, ALCANCES, MODULOS, alcanceLabel, firmaFilas, type Accion, type PermisoFila } from "@/lib/shared/permisos";
import { REGLAS_COMBINACION } from "@/lib/shared/combinaciones-roles";
import { API_BASE_URL, armarReauth, getJsonAuth, sendJsonAuth } from "@/lib/client/api";
import { CampoIdentidad } from "@/components/session/Reautenticar";
import { AutorizacionesUsuario } from "@/components/features/admin/AutorizacionesPanel";
import { SegmentedTabs } from "@/components/ui/PageHeader";
import { fmtDate, fmtDateTime } from "@/lib/client/format";
import { invalidate } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { hoyLocal } from "@/lib/shared/fechas";

/* ---------- Roles: matriz modulos x acciones con alcance por celda (Fase 1) ---------- */

type Matriz = Record<string, string | null>;
const celda = (modulo: string, accion: string) => `${modulo}:${accion}`;

function matrizDesdeFilas(filas: PermisoFila[]): Matriz {
  const out: Matriz = {};
  for (const fila of filas) {
    const key = celda(fila.modulo, fila.accion);
    // Si una celda tuviera varios alcances, se muestra el primero ("total" primero).
    if (!out[key] || fila.alcance === "total") out[key] = fila.alcance || "total";
  }
  return out;
}

function filasDesdeMatriz(matriz: Matriz): PermisoFila[] {
  const filas: PermisoFila[] = [];
  for (const modulo of MODULOS) {
    for (const accion of ACCION_KEYS) {
      const alcance = matriz[celda(modulo.clave, accion)];
      if (alcance) filas.push({ modulo: modulo.clave, accion, alcance });
    }
  }
  return filas;
}

const ACCION_AYUDA: Record<Accion, string> = {
  V: "Ver",
  C: "Crear / capturar",
  E: "Editar borrador",
  R: "Revisar",
  A: "Aprobar / validar / liberar",
  AN: "Anular con justificación",
  G: "Administrar (implica todas)",
};

export function RoleSheet({ open, role, initialPermisos, usuarios = [], readOnly = false, onClose }: { open: boolean; role: ApiRecord | null; initialPermisos: PermisoFila[]; usuarios?: ApiRecord[]; readOnly?: boolean; onClose: () => void }) {
  const { token, can, roles: rolesSesion } = useSession();
  const prompt = usePrompt();
  const [nombre, setNombre] = useState(String(role?.nombre || ""));
  const [descripcion, setDescripcion] = useState(String(role?.descripcion || ""));
  const [activo, setActivo] = useState(role ? !!role.activo : true);
  const [matriz, setMatriz] = useState<Matriz>(() => matrizDesdeFilas(initialPermisos));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = !!role?.id;
  // Fase 3.1: nadie edita los permisos de un rol que tiene vigente (el servidor responde 409 rol_propio).
  const rolPropio = editing && rolesSesion.some((rol) => Number(rol.id) === Number(role?.id));
  const puedeEditar = !readOnly && !rolPropio && can("usuarios", "G");

  const toggle = (modulo: string, accion: string, checked: boolean) => setMatriz((prev) => ({ ...prev, [celda(modulo, accion)]: checked ? prev[celda(modulo, accion)] || "total" : null }));
  const setAlcance = (modulo: string, accion: string, alcance: string) => setMatriz((prev) => ({ ...prev, [celda(modulo, accion)]: alcance }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!puedeEditar) return;
    const permisos = filasDesdeMatriz(matriz);
    if (!nombre.trim()) {
      setError("El nombre del rol es obligatorio");
      return;
    }
    const cambiaPermisos = editing && (firmaFilas(initialPermisos) !== firmaFilas(permisos) || !!role?.activo !== activo);
    let motivo: string | null = null;
    if (cambiaPermisos) {
      motivo = await prompt({ critico: true, title: "Motivo del cambio de permisos", description: "Queda en la bitácora junto con los permisos antes y después.", label: "Motivo", minLength: 5, confirmLabel: "Guardar cambios" });
      if (!motivo) return;
    }
    const payload = { nombre: nombre.trim(), descripcion: descripcion.trim(), activo, permisos, ...(motivo ? { motivo } : {}) };
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

  const modulos = MODULOS.filter((m) => !HIDDEN_MODULES.has(m.clave) || Object.keys(matriz).some((k) => k.startsWith(`${m.clave}:`) && matriz[k]));

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => !value && onClose()}
      title={!puedeEditar ? `Permisos de ${String(role?.nombre || "rol")}` : editing ? "Editar rol" : "Nuevo rol"}
      description="Qué puede hacer el rol en cada módulo y con qué alcance. Lo que no se marca, no se concede."
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {puedeEditar ? "Cancelar" : "Cerrar"}
          </Button>
          {puedeEditar ? (
            <Button type="submit" form="role-form" loading={submitting}>
              {editing ? "Guardar cambios" : "Crear rol"}
            </Button>
          ) : null}
        </>
      }
    >
      <form id="role-form" onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        {rolPropio && !readOnly && can("usuarios", "G") ? (
          <Callout tone="warning" title="No puedes editar un rol que tienes asignado">
            Sus permisos los debe cambiar otra persona con permiso de administrar usuarios.
          </Callout>
        ) : null}
        {error ? (
          <Callout tone="danger" title={/combinaci/i.test(error) ? "Combinación de roles prohibida" : "No se pudo guardar"}>
            {error}
          </Callout>
        ) : null}
        <fieldset disabled={!puedeEditar} className="contents">
          <FormGrid>
            <Field label="Nombre" htmlFor="role-nombre" required className="sm:col-span-2">
              <Input id="role-nombre" maxLength={100} value={nombre} onChange={(event) => setNombre(event.target.value)} autoFocus={!editing} invalid={!!error && !nombre.trim()} />
            </Field>
            <Field label="Descripción" htmlFor="role-descripcion" className="sm:col-span-2">
              <Textarea id="role-descripcion" rows={2} value={descripcion} onChange={(event) => setDescripcion(event.target.value)} />
            </Field>
          </FormGrid>
          <Switch checked={activo} onCheckedChange={setActivo} label="Rol activo" description="Un rol inactivo no concede permisos a nadie (sus asignaciones se conservan)." />
        </fieldset>

        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-[15px] font-semibold text-ink">Permisos por módulo</h3>
            <p className="text-[12.5px] text-ink-3">C, E, R, A y AN implican ver (V); G implica todas las acciones del módulo. El alcance limita la acción; los alcances marcados «se aplica en Fase X» se guardan pero todavía no restringen.</p>
          </div>
          <div className="overflow-x-auto rounded-card border border-line">
            <table className="w-full min-w-[880px] text-[13px]">
              <thead className="bg-surface-2/70 text-[12px] text-ink-3">
                <tr>
                  <th className="h-9 px-3 text-left font-medium">Módulo</th>
                  {ACCIONES.map((accion) => (
                    <th key={accion.clave} className="h-9 px-1 text-center font-medium" title={ACCION_AYUDA[accion.clave]}>
                      {accion.clave}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {modulos.map((modulo) => (
                  <tr key={modulo.clave} className="align-top hover:bg-surface-2/40">
                    <td className="px-3 py-2">
                      <div className="font-medium text-ink">{modulo.nombre}</div>
                      <div className="text-[11.5px] text-ink-3">{HIDDEN_MODULES.has(modulo.clave) ? "Módulo apagado por ahora" : modulo.descripcion}</div>
                    </td>
                    {ACCION_KEYS.map((accion) => {
                      const alcance = matriz[celda(modulo.clave, accion)] || null;
                      return (
                        <td key={accion} className="px-1 py-2 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Checkbox className="inline-flex" aria-label={`${accion} en ${modulo.nombre}`} checked={!!alcance} disabled={!puedeEditar} onChange={(event) => toggle(modulo.clave, accion, event.target.checked)} />
                            {alcance ? (
                              <select
                                aria-label={`Alcance de ${accion} en ${modulo.nombre}`}
                                value={alcance}
                                disabled={!puedeEditar}
                                onChange={(event) => setAlcance(modulo.clave, accion, event.target.value)}
                                className="w-[92px] rounded-[6px] border border-line bg-surface px-1 py-0.5 text-[11px] text-ink-2"
                                title={alcanceLabel(alcance)}
                              >
                                {ALCANCES.map((a) => (
                                  <option key={a.clave} value={a.clave}>
                                    {alcanceLabel(a.clave)}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Callout tone="info" title="Combinaciones de roles prohibidas">
          Al guardar se comprueba que ninguna persona con este rol quede con una combinación prohibida; si pasa, el cambio se rechaza y se indica a quién afecta.
          <ul className="mt-1.5 list-disc pl-4">
            {REGLAS_COMBINACION.map((regla) => (
              <li key={regla.numero}>
                Regla {regla.numero}: {regla.titulo}
              </li>
            ))}
          </ul>
        </Callout>

        {editing ? (
          <Panel title="Personas con este rol" description="Asignaciones vigentes o por comenzar.">
            {usuarios.length ? (
              <ul className="flex flex-col gap-1 text-[13px]">
                {usuarios.map((u) => (
                  <li key={String(u.id)} className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium text-ink">{u.nombre || u.email}</span>
                    <span className="text-ink-3">{u.email}</span>
                    <span className="text-[12px] text-ink-4">
                      desde {fmtDate(u.vigente_desde)}
                      {u.vigente_hasta ? ` hasta ${fmtDate(u.vigente_hasta)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-ink-3">Nadie tiene este rol.</p>
            )}
          </Panel>
        ) : null}
      </form>
    </Sheet>
  );
}

/* ---------- Usuarios ---------- */

const ESTADO_ASIGNACION: Record<string, { label: string; tone: "success" | "brand" | "neutral" | "danger" }> = {
  vigente: { label: "Vigente", tone: "success" },
  futuro: { label: "Por comenzar", tone: "brand" },
  vencido: { label: "Vencido", tone: "neutral" },
  revocado: { label: "Revocado", tone: "danger" },
};

export function UserSheet({ open, item, readOnly = false, onClose }: { open: boolean; item: ApiRecord | null; readOnly?: boolean; onClose: () => void }) {
  const { token, can, authConfig, user: me } = useSession();
  const prompt = usePrompt();
  const [roles, setRoles] = useState<ApiRecord[]>([]);
  const [nombre, setNombre] = useState(String(item?.nombre || ""));
  const [email, setEmail] = useState(String(item?.email || ""));
  const [roleId, setRoleId] = useState("");
  const [motivoAlta, setMotivoAlta] = useState("Alta de usuario");
  const [departamento, setDepartamento] = useState(String(item?.departamento || ""));
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activo, setActivo] = useState(item ? !!item.activo : true);
  const [avatar, setAvatar] = useState<string | null>(item?.avatar ? String(item.avatar) : null);
  const [asignaciones, setAsignaciones] = useState<ApiRecord[]>((item?.asignaciones || []) as ApiRecord[]);
  const [nueva, setNueva] = useState({ rol_id: "", desde: hoyLocal(), hasta: "", motivo: "" });
  const [asignando, setAsignando] = useState(false);
  // Fase 3: nota de la ultima asignacion que quedo pendiente de un segundo usuario.
  const [pendiente, setPendiente] = useState<string | null>(null);
  // Fase 2: vigencia de la cuenta y supervisor (temporal => fin y supervisor obligatorios).
  const [tipoCuenta, setTipoCuenta] = useState<string>(String(item?.tipo_cuenta || "permanente"));
  const [cuentaDesde, setCuentaDesde] = useState(String(item?.vigente_desde || ""));
  const [cuentaHasta, setCuentaHasta] = useState(String(item?.vigente_hasta || ""));
  const [supervisorId, setSupervisorId] = useState(item?.supervisor_id ? String(item.supervisor_id) : "");
  const [motivoCuenta, setMotivoCuenta] = useState("");
  const [personas, setPersonas] = useState<ApiRecord[]>([]);
  // Contrasena de quien administra: confirma la identidad en la misma hoja (reautenticacion).
  const [clave, setClave] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = !!item?.id;
  const puedeAdministrar = !readOnly && can("usuarios", "G");
  const esPropia = editing && Number(me?.id) === Number(item?.id);
  // Fase 4: pestañas de la ficha (roles / autorizaciones FX-THF-AP).
  const [pestana, setPestana] = useState<"roles" | "autorizaciones">("roles");

  useEffect(() => {
    if (!open || !token || !puedeAdministrar) return;
    getJsonAuth(`${API_BASE_URL}/admin/roles`, token)
      .then((data) => setRoles(((data.items || []) as ApiRecord[]).filter((role) => !!role.activo)))
      .catch(() => setRoles([]));
    // Posibles supervisores: cuentas activas y permanentes (el servidor valida que tengan R o A en ensayos o muestras).
    getJsonAuth(`${API_BASE_URL}/admin/usuarios`, token)
      .then((data) => setPersonas(((data.items || []) as ApiRecord[]).filter((u) => !!u.activo && String(u.tipo_cuenta || "permanente") !== "temporal" && !u.vigente_hasta && Number(u.id) !== Number(item?.id))))
      .catch(() => setPersonas([]));
  }, [open, token, puedeAdministrar, item?.id]);

  const cambiaCuenta =
    editing &&
    (String(item?.tipo_cuenta || "permanente") !== tipoCuenta ||
      String(item?.vigente_desde || "") !== cuentaDesde ||
      String(item?.vigente_hasta || "") !== cuentaHasta ||
      String(item?.supervisor_id || "") !== supervisorId);
  // Pide la contrasena en la hoja cuando el guardado es critico: alta (asigna rol), cambio de vigencia o supervisor, baja o fijar la contrasena de otra persona.
  const guardadoCritico = !editing || cambiaCuenta || (editing && !!item?.activo && !activo) || (editing && !!password && !esPropia);

  const userId = item?.id;
  const recargar = async () => {
    if (!userId) return;
    const data = await getJsonAuth(`${API_BASE_URL}/admin/usuarios/${userId}`, token);
    setAsignaciones(((data.item || {}).asignaciones || []) as ApiRecord[]);
  };

  const dominios = authConfig.dominios_permitidos || [];

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!puedeAdministrar) return;
    const payload: Record<string, unknown> = {
      nombre: nombre.trim(),
      email: email.trim(),
      departamento: departamento.trim() || null,
      ...(avatar ? { avatar } : {}),
      activo,
    };
    if (password) payload.password = password;
    if (!payload.email) {
      setError("El correo es obligatorio");
      return;
    }
    const emailCambio = !editing || String(item?.email || "").toLowerCase() !== String(payload.email).toLowerCase();
    if (emailCambio && dominios.length && !dominios.some((d) => String(payload.email).toLowerCase().endsWith(`@${d}`))) {
      setError(`Solo se aceptan correos de ${dominios.map((d) => `@${d}`).join(", ")}`);
      return;
    }
    if (!editing) {
      if (!roleId) {
        setError("Selecciona el rol inicial");
        return;
      }
      if (motivoAlta.trim().length < 5) {
        setError("Indica el motivo de la asignación (al menos 5 caracteres)");
        return;
      }
      payload.rol_id = Number(roleId);
      payload.motivo = motivoAlta.trim();
    }
    if (!editing && !password) {
      setError("Define una contraseña inicial");
      return;
    }
    if (password && password.length < 10) {
      setError("La contraseña debe tener al menos 10 caracteres");
      return;
    }
    payload.tipo_cuenta = tipoCuenta;
    payload.vigente_desde = cuentaDesde || null;
    payload.vigente_hasta = cuentaHasta || null;
    payload.supervisor_id = supervisorId ? Number(supervisorId) : null;
    if (tipoCuenta === "temporal" && (!cuentaHasta || !supervisorId)) {
      setError("Una cuenta temporal necesita fecha de fin y supervisor");
      return;
    }
    if (cambiaCuenta) {
      if (motivoCuenta.trim().length < 5) {
        setError("Indica el motivo del cambio de vigencia o supervisor (al menos 5 caracteres)");
        return;
      }
      payload.motivo_cuenta = motivoCuenta.trim();
    }
    if (guardadoCritico) armarReauth(clave ? { password: clave } : null);
    setSubmitting(true);
    setError(null);
    try {
      // Fase 3: el rol inicial, la reactivacion y la ampliacion de vigencia los aprueba un segundo usuario (respuesta con `solicitud`).
      const data = await sendJsonAuth(editing ? "PUT" : "POST", editing ? `${API_BASE_URL}/admin/usuarios/${item!.id}` : `${API_BASE_URL}/admin/usuarios`, token, payload);
      if (data.solicitud) toast.info(String(data.message || "Pendiente de autorización de un segundo usuario"), { duration: 8000 });
      else toast.success(editing ? "Usuario actualizado" : "Usuario creado");
      invalidate("usuarios", "roles", "solicitudes");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el usuario");
    } finally {
      setSubmitting(false);
    }
  };

  const asignar = async () => {
    if (!nueva.rol_id) return toast.error("Elige el rol a asignar");
    if (nueva.motivo.trim().length < 5) return toast.error("Indica el motivo de la asignación (al menos 5 caracteres)");
    armarReauth(clave ? { password: clave } : null);
    setAsignando(true);
    try {
      const data = await sendJsonAuth("POST", `${API_BASE_URL}/admin/usuarios/${item!.id}/roles`, token, { rol_id: Number(nueva.rol_id), vigente_desde: nueva.desde || null, vigente_hasta: nueva.hasta || null, motivo: nueva.motivo.trim() });
      // Fase 3: la asignacion queda pendiente de la autorizacion de un segundo usuario (usuarios:A).
      if (data.solicitud) {
        toast.info(String(data.message || "Asignación pendiente de autorización"), { duration: 8000 });
        setPendiente(`Pendiente de autorización de un segundo usuario (solicitud #${String((data.solicitud as ApiRecord).id)})`);
      } else toast.success("Rol asignado");
      setNueva({ rol_id: "", desde: hoyLocal(), hasta: "", motivo: "" });
      await recargar();
      invalidate("usuarios", "roles", "solicitudes");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo asignar el rol");
    } finally {
      setAsignando(false);
    }
  };

  const revocar = async (asignacion: ApiRecord) => {
    const motivo = await prompt({ critico: true, title: `Revocar el rol "${asignacion.rol}"`, description: "La asignación se conserva en el historial como revocada; los permisos dejan de contar de inmediato.", label: "Motivo", minLength: 5, confirmLabel: "Revocar", tone: "danger" });
    if (!motivo) return;
    try {
      await sendJsonAuth("POST", `${API_BASE_URL}/admin/usuarios/${item!.id}/roles/${asignacion.id}/revocar`, token, { motivo });
      toast.success("Rol revocado");
      await recargar();
      invalidate("usuarios", "roles");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo revocar el rol");
    }
  };

  const ordenadas = useMemo(() => {
    const peso: Record<string, number> = { vigente: 0, futuro: 1, vencido: 2, revocado: 3 };
    return [...asignaciones].sort((a, b) => (peso[String(a.estado)] ?? 9) - (peso[String(b.estado)] ?? 9));
  }, [asignaciones]);

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => !value && onClose()}
      title={!puedeAdministrar ? String(item?.nombre || item?.email || "Usuario") : editing ? "Editar usuario" : "Nuevo usuario"}
      description={editing ? "Datos de acceso y roles con su vigencia." : "Acceso con correo institucional; la cuenta nace con un rol inicial."}
      size="lg"
      footer={
        <>
          {error ? <p className="mr-auto text-[13px] text-danger">{error}</p> : null}
          <Button variant="secondary" onClick={onClose}>
            {puedeAdministrar ? "Cancelar" : "Cerrar"}
          </Button>
          {puedeAdministrar ? (
            <Button type="submit" form="user-form" loading={submitting}>
              {editing ? "Guardar cambios" : "Crear usuario"}
            </Button>
          ) : null}
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <fieldset disabled={!puedeAdministrar} className="contents">
          <FormGrid>
            <Field label="Nombre" htmlFor="u-nombre">
              <Input id="u-nombre" maxLength={100} value={nombre} onChange={(event) => setNombre(event.target.value)} autoFocus={!editing} />
            </Field>
            <Field label="Correo" htmlFor="u-email" required hint={editing || !dominios.length ? undefined : `Debe ser de ${dominios.map((d) => `@${d}`).join(", ")}`}>
              <Input id="u-email" type="email" maxLength={100} value={email} onChange={(event) => setEmail(event.target.value)} invalid={!!error && !email.trim()} />
            </Field>
            {!editing ? (
              <>
                <Field label="Rol inicial" htmlFor="u-rol" required>
                  <Select id="u-rol" value={roles.some((role) => String(role.id) === roleId) ? roleId : ""} onChange={(event) => setRoleId(event.target.value)} invalid={!!error && !roleId}>
                    <option value="">Seleccionar rol</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Motivo de la asignación" htmlFor="u-motivo-rol" required hint="Queda en la bitácora.">
                  <Input id="u-motivo-rol" maxLength={200} value={motivoAlta} onChange={(event) => setMotivoAlta(event.target.value)} />
                </Field>
              </>
            ) : null}
            <Field label="Departamento" htmlFor="u-depto">
              <Input id="u-depto" maxLength={100} value={departamento} onChange={(event) => setDepartamento(event.target.value)} />
            </Field>
            {puedeAdministrar ? (
              <>
                <Field label="Avatar" hint={editing ? "La persona también puede cambiarlo desde Mi cuenta." : "Si no eliges uno, se asigna al azar."} className="sm:col-span-2">
                  <AvatarPicker value={avatar} seed={email.trim().toLowerCase() || nombre.toLowerCase()} onChange={setAvatar} size={44} />
                </Field>
                {esPropia ? (
                  <p className="text-[12.5px] text-ink-3 sm:col-span-2">Tu propia contraseña se cambia en Mi cuenta › Cambiar contraseña.</p>
                ) : (
                  <Field label={editing ? "Nueva contraseña" : "Contraseña"} htmlFor="u-password" required={!editing} hint={editing ? "Déjala vacía para conservar la actual. Si la cambias, la persona deberá cambiarla al entrar." : "Mínimo 10 caracteres; distinta del correo y del nombre."} className="sm:col-span-2">
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
                )}
              </>
            ) : null}
          </FormGrid>
          {puedeAdministrar ? <Switch checked={activo} onCheckedChange={setActivo} label="Usuario activo" description="Un usuario inactivo conserva su historial pero no puede entrar." /> : null}

          <Panel title="Vigencia de la cuenta" description="Una cuenta temporal (estudiantes, estancias) necesita fecha de fin y un supervisor; fuera de su vigencia no puede entrar y sus roles no pueden durar más que la cuenta.">
            <FormGrid>
              <Field label="Tipo de cuenta" htmlFor="u-tipo-cuenta">
                <Select id="u-tipo-cuenta" value={tipoCuenta} onChange={(event) => setTipoCuenta(event.target.value)}>
                  <option value="permanente">Permanente</option>
                  <option value="temporal">Temporal</option>
                </Select>
              </Field>
              <Field label="Supervisor" htmlFor="u-supervisor" required={tipoCuenta === "temporal"} hint="Persona con cuenta permanente que revisa y aprueba en ensayos o muestras.">
                <Select id="u-supervisor" value={supervisorId} onChange={(event) => setSupervisorId(event.target.value)}>
                  <option value="">Sin supervisor</option>
                  {personas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre || p.email}
                    </option>
                  ))}
                  {supervisorId && !personas.some((p) => String(p.id) === supervisorId) ? <option value={supervisorId}>{String(item?.supervisor_nombre || `Usuario #${supervisorId}`)}</option> : null}
                </Select>
              </Field>
              <Field label="Vigente desde" htmlFor="u-cuenta-desde" hint="Opcional">
                <DateInput id="u-cuenta-desde" value={cuentaDesde} onChange={(value) => setCuentaDesde(value)} />
              </Field>
              <Field label="Vigente hasta" htmlFor="u-cuenta-hasta" required={tipoCuenta === "temporal"} hint={tipoCuenta === "temporal" ? undefined : "Opcional"}>
                <DateInput id="u-cuenta-hasta" value={cuentaHasta} onChange={(value) => setCuentaHasta(value)} />
              </Field>
              {cambiaCuenta ? (
                <Field label="Motivo del cambio de vigencia o supervisor" htmlFor="u-motivo-cuenta" required hint="Queda en la bitácora." className="sm:col-span-2">
                  <Input id="u-motivo-cuenta" maxLength={300} value={motivoCuenta} onChange={(event) => setMotivoCuenta(event.target.value)} />
                </Field>
              ) : null}
            </FormGrid>
          </Panel>
          {puedeAdministrar && guardadoCritico ? <CampoIdentidad value={clave} onChange={setClave} id="u-clave-admin" /> : null}
        </fieldset>
      </form>

      {editing ? (
        <SegmentedTabs
          className="mt-6"
          size="sm"
          label="Ficha del usuario"
          value={pestana}
          onChange={setPestana}
          options={[
            { value: "roles", label: "Roles" },
            { value: "autorizaciones", label: "Autorizaciones (FX-THF-AP)" },
          ]}
        />
      ) : null}

      {editing && pestana === "autorizaciones" ? (
        <section className="mt-4 flex flex-col gap-3" aria-label="Autorizaciones del usuario">
          <AutorizacionesUsuario usuarioId={Number(item!.id)} />
        </section>
      ) : null}

      {editing && pestana === "roles" ? (
        <section className="mt-4 flex flex-col gap-3" aria-label="Roles del usuario">
          <div>
            <h3 className="text-[15px] font-semibold text-ink">Roles</h3>
            <p className="text-[12.5px] text-ink-3">Los permisos son la unión de los roles vigentes. Nada se borra: revocar deja la asignación en el historial.</p>
          </div>
          {ordenadas.length ? (
            <ul className="flex flex-col divide-y divide-line rounded-card border border-line">
              {ordenadas.map((a) => {
                const estado = ESTADO_ASIGNACION[String(a.estado)] || ESTADO_ASIGNACION.vigente;
                const revocable = puedeAdministrar && !esPropia && (a.estado === "vigente" || a.estado === "futuro");
                return (
                  <li key={String(a.id)} className="flex flex-wrap items-start gap-3 px-3 py-2.5" data-asignacion={String(a.id)}>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-ink">{a.rol || `Rol #${a.rol_id}`}</span>
                        <Badge tone={estado.tone} dot>
                          {estado.label}
                        </Badge>
                      </div>
                      <span className="text-[12.5px] text-ink-3">
                        Desde {fmtDate(a.vigente_desde)}
                        {a.vigente_hasta ? ` hasta ${fmtDate(a.vigente_hasta)}` : " · sin fecha de fin"}
                        {a.asignado_por_nombre ? ` · asignó ${a.asignado_por_nombre}` : ""}
                      </span>
                      {a.motivo ? <span className="text-[12.5px] text-ink-2">Motivo: {a.motivo}</span> : null}
                      {a.revocado_en ? (
                        <span className="text-[12.5px] text-danger">
                          Revocado el {fmtDateTime(a.revocado_en)}
                          {a.revocado_por_nombre ? ` por ${a.revocado_por_nombre}` : ""}
                          {a.motivo_revocacion ? ` · ${a.motivo_revocacion}` : ""}
                        </span>
                      ) : null}
                    </div>
                    {revocable ? (
                      <Button size="sm" variant="secondary" icon={<Prohibit size={14} />} onClick={() => revocar(a)}>
                        Revocar
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[13px] text-ink-3">Sin roles: la persona puede entrar pero no ve nada.</p>
          )}

          {puedeAdministrar && esPropia ? <Callout tone="info">Nadie puede asignarse ni revocarse roles a sí mismo: pide a otra persona con administración de usuarios que lo haga.</Callout> : null}

          {puedeAdministrar && !esPropia ? (
            <Panel title="Asignar rol" description="La asignación se valida contra las combinaciones prohibidas y la aprueba un segundo usuario con A en usuarios (Responsable General); queda en la bitácora con su motivo.">
              <FormGrid>
                <Field label="Rol" htmlFor="u-asignar-rol" required>
                  <Select id="u-asignar-rol" value={nueva.rol_id} onChange={(event) => setNueva((prev) => ({ ...prev, rol_id: event.target.value }))}>
                    <option value="">Seleccionar rol</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Motivo" htmlFor="u-asignar-motivo" required>
                  <Input id="u-asignar-motivo" maxLength={300} value={nueva.motivo} onChange={(event) => setNueva((prev) => ({ ...prev, motivo: event.target.value }))} placeholder="Ej. Cambio de funciones" />
                </Field>
                <Field label="Vigente desde" htmlFor="u-asignar-desde">
                  <DateInput id="u-asignar-desde" value={nueva.desde} onChange={(value) => setNueva((prev) => ({ ...prev, desde: value }))} />
                </Field>
                <Field label="Vigente hasta" htmlFor="u-asignar-hasta" hint="Opcional">
                  <DateInput id="u-asignar-hasta" value={nueva.hasta} onChange={(value) => setNueva((prev) => ({ ...prev, hasta: value }))} />
                </Field>
              </FormGrid>
              {!guardadoCritico ? <CampoIdentidad value={clave} onChange={setClave} id="u-clave-asignar" /> : null}
              <div className="flex flex-wrap items-center gap-3">
                <Button icon={<Plus size={14} weight="bold" />} onClick={asignar} loading={asignando}>
                  Asignar rol
                </Button>
                {pendiente ? <span className="text-[12.5px] text-warning-text">{pendiente}</span> : null}
              </div>
            </Panel>
          ) : null}
        </section>
      ) : null}
    </Sheet>
  );
}
