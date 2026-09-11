"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Overlay";
import { API_BASE_URL, getJsonAuth, sendJsonAuth } from "@/lib/client/api";
import { toDateOnly } from "@/lib/client/format";
import { invalidate } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { EQUIPO_ESTADOS, MANTENIMIENTO_ESTADOS, MANTENIMIENTO_TIPOS } from "./meta";

function useActiveUsers(enabled: boolean) {
  const { token, can } = useSession();
  const [users, setUsers] = useState<ApiRecord[]>([]);
  useEffect(() => {
    if (!enabled || !token || !can("usuarios")) return;
    getJsonAuth(`${API_BASE_URL}/admin/usuarios`, token)
      .then((data) => setUsers(((data.items || []) as ApiRecord[]).filter((user) => !!user.activo)))
      .catch(() => setUsers([]));
  }, [enabled, token, can]);
  return users;
}

export function EquipoSheet({ open, item, onClose }: { open: boolean; item: ApiRecord | null; onClose: () => void }) {
  const { token, can } = useSession();
  const users = useActiveUsers(open);
  const [form, setForm] = useState({
    nombre: String(item?.nombre || ""),
    serie: String(item?.numero_serie || ""),
    marca: String(item?.marca || ""),
    modelo: String(item?.modelo || ""),
    ubicacion: String(item?.ubicacion || ""),
    responsable: item?.id_responsable ? String(item.id_responsable) : "",
    calibracion: toDateOnly(item?.fecha_prox_calibracion),
    estado: String(item?.estado || "operativo"),
    claveBitacora: String(item?.clave_bitacora || ""),
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = !!item?.id;
  const set = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      nombre: form.nombre.trim(),
      marca: form.marca.trim() || null,
      modelo: form.modelo.trim() || null,
      numero_serie: form.serie.trim() || null,
      ubicacion: form.ubicacion.trim() || null,
      id_responsable: Number(form.responsable || 0) || null,
      fecha_prox_calibracion: form.calibracion || null,
      estado: form.estado || "operativo",
      clave_bitacora: form.claveBitacora.trim() || null,
    };
    if (!payload.nombre) {
      setError("El nombre del equipo es obligatorio");
      return;
    }
    if (!can("equipos", editing ? "update" : "create")) {
      setError("No tienes permiso para esta acción");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (editing) {
        await sendJsonAuth("PUT", `${API_BASE_URL}/inventory/equipos/${item!.id}`, token, payload);
        toast.success("Equipo actualizado");
      } else {
        await sendJsonAuth("POST", `${API_BASE_URL}/inventory/equipos`, token, payload);
        toast.success("Equipo creado");
      }
      invalidate("equipos", "dashboard");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el equipo");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => !value && onClose()}
      title={editing ? "Editar equipo" : "Nuevo equipo"}
      description="Identificación, ubicación y estado de calibración."
      footer={
        <>
          {error ? <p className="mr-auto text-[13px] text-danger">{error}</p> : null}
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="equipo-form" loading={submitting}>
            {editing ? "Guardar cambios" : "Crear equipo"}
          </Button>
        </>
      }
    >
      <form id="equipo-form" onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <Field label="Nombre del equipo" htmlFor="e-nombre" required>
          <Input id="e-nombre" maxLength={150} value={form.nombre} onChange={set("nombre")} autoFocus={!editing} invalid={!!error && !form.nombre.trim()} />
        </Field>
        <FormGrid>
          <Field label="Marca" htmlFor="e-marca">
            <Input id="e-marca" maxLength={100} value={form.marca} onChange={set("marca")} />
          </Field>
          <Field label="Modelo" htmlFor="e-modelo">
            <Input id="e-modelo" maxLength={100} value={form.modelo} onChange={set("modelo")} />
          </Field>
          <Field label="Número de serie" htmlFor="e-serie">
            <Input id="e-serie" maxLength={100} value={form.serie} onChange={set("serie")} mono />
          </Field>
          <Field label="Ubicación" htmlFor="e-ubicacion">
            <Input id="e-ubicacion" maxLength={150} value={form.ubicacion} onChange={set("ubicacion")} />
          </Field>
          <Field label="Responsable" htmlFor="e-responsable">
            <Select id="e-responsable" value={form.responsable} onChange={set("responsable")}>
              <option value="">Sin responsable</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Próxima calibración" htmlFor="e-calibracion">
            <Input id="e-calibracion" type="date" value={form.calibracion} onChange={set("calibracion")} />
          </Field>
          <Field label="Estado" htmlFor="e-estado" required>
            <Select id="e-estado" value={form.estado} onChange={set("estado")}>
              {EQUIPO_ESTADOS.map((estado) => (
                // "En mantenimiento" lo pone y lo quita Mantenimiento; a mano solo los demás.
                <option key={estado.value} value={estado.value} disabled={estado.value === "mantenimiento" && form.estado !== "mantenimiento"}>
                  {estado.label}
                  {estado.value === "mantenimiento" ? " (lo define Mantenimiento)" : ""}
                </option>
              ))}
            </Select>
          </Field>
        </FormGrid>
        <Field label="Clave de bitácora" htmlFor="e-bitacora" hint="Bitácora de uso del equipo (FX-TCB-…). Se copia a los formatos de extracción para anotar el folio.">
          <Input id="e-bitacora" maxLength={60} value={form.claveBitacora} onChange={set("claveBitacora")} mono placeholder="FX-TCB-BA1-27/1" />
        </Field>
      </form>
    </Sheet>
  );
}

export function MantenimientoSheet({ open, item, onClose }: { open: boolean; item: ApiRecord | null; onClose: () => void }) {
  const { token, can } = useSession();
  const users = useActiveUsers(open);
  const [equipos, setEquipos] = useState<ApiRecord[]>([]);
  const [form, setForm] = useState({
    equipo: item?.id_equipo ? String(item.id_equipo) : "",
    tipo: String(item?.tipo || "preventivo"),
    fechaProgramada: toDateOnly(item?.fecha_programada),
    fechaRealizado: toDateOnly(item?.fecha_realizado),
    tecnico: String(item?.tecnico_proveedor || ""),
    responsable: item?.id_responsable ? String(item.id_responsable) : "",
    estado: String(item?.estado || "programado"),
    observaciones: String(item?.observaciones || ""),
    proximaCalibracion: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = !!item?.id;

  useEffect(() => {
    if (!open || !token) return;
    getJsonAuth(`${API_BASE_URL}/inventory/equipos`, token)
      .then((data) => setEquipos((data.items || []) as ApiRecord[]))
      .catch(() => setEquipos([]));
  }, [open, token]);

  const set = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      id_equipo: Number(form.equipo || 0),
      tipo: form.tipo || "preventivo",
      fecha_programada: form.fechaProgramada || null,
      fecha_realizado: form.fechaRealizado || null,
      tecnico_proveedor: form.tecnico.trim() || null,
      id_responsable: Number(form.responsable || 0) || null,
      estado: form.estado || "programado",
      observaciones: form.observaciones.trim() || null,
      proxima_calibracion: form.tipo === "calibracion" && form.estado === "completado" ? form.proximaCalibracion || null : null,
    };
    if (!payload.id_equipo) {
      setError("Selecciona un equipo");
      return;
    }
    if (!payload.fecha_programada) {
      setError("La fecha programada es obligatoria");
      return;
    }
    if (payload.estado === "completado" && !payload.fecha_realizado) {
      setError("Indica la fecha en que se realizó para marcarlo como completado");
      return;
    }
    if (!can("mantenimiento", editing ? "update" : "create")) {
      setError("No tienes permiso para esta acción");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (editing) {
        await sendJsonAuth("PUT", `${API_BASE_URL}/inventory/mantenimientos/${item!.id}`, token, payload);
        toast.success("Mantenimiento actualizado");
      } else {
        await sendJsonAuth("POST", `${API_BASE_URL}/inventory/mantenimientos`, token, payload);
        toast.success("Mantenimiento programado");
      }
      invalidate("mantenimientos", "documentos", "dashboard", "equipos");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el mantenimiento");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(value) => !value && onClose()}
      title={editing ? "Editar mantenimiento" : "Programar mantenimiento"}
      description="Fechas programadas de mantenimiento y calibración."
      footer={
        <>
          {error ? <p className="mr-auto text-[13px] text-danger">{error}</p> : null}
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="mantenimiento-form" loading={submitting}>
            {editing ? "Guardar cambios" : "Programar"}
          </Button>
        </>
      }
    >
      <form id="mantenimiento-form" onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <Field label="Equipo" htmlFor="m-equipo" required>
          <Select id="m-equipo" value={form.equipo} onChange={set("equipo")} autoFocus={!editing} invalid={!!error && !form.equipo}>
            <option value="">Seleccionar equipo</option>
            {equipos.map((equipo) => (
              <option key={equipo.id} value={equipo.id}>
                {[equipo.nombre, equipo.marca, equipo.modelo].filter(Boolean).join(" · ") || `Equipo ${equipo.id}`}
              </option>
            ))}
          </Select>
        </Field>
        <FormGrid>
          <Field label="Tipo" htmlFor="m-tipo" required>
            <Select id="m-tipo" value={form.tipo} onChange={set("tipo")}>
              {MANTENIMIENTO_TIPOS.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado" htmlFor="m-estado" required>
            <Select id="m-estado" value={form.estado} onChange={set("estado")}>
              {MANTENIMIENTO_ESTADOS.map((estado) => (
                <option key={estado.value} value={estado.value}>
                  {estado.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha programada" htmlFor="m-fecha" required>
            <Input id="m-fecha" type="date" value={form.fechaProgramada} onChange={set("fechaProgramada")} invalid={!!error && !form.fechaProgramada} />
          </Field>
          <Field label="Fecha realizado" htmlFor="m-realizado" required={form.estado === "completado"}>
            <Input id="m-realizado" type="date" value={form.fechaRealizado} onChange={set("fechaRealizado")} invalid={!!error && form.estado === "completado" && !form.fechaRealizado} />
          </Field>
          {form.tipo === "calibracion" && form.estado === "completado" ? (
            <Field label="Próxima calibración" htmlFor="m-proxima" hint="Se anota en la ficha del equipo." className="sm:col-span-2">
              <Input id="m-proxima" type="date" value={form.proximaCalibracion} onChange={set("proximaCalibracion")} />
            </Field>
          ) : null}
          <Field label="Técnico o proveedor" htmlFor="m-tecnico">
            <Input id="m-tecnico" maxLength={150} value={form.tecnico} onChange={set("tecnico")} />
          </Field>
          <Field label="Responsable interno" htmlFor="m-responsable">
            <Select id="m-responsable" value={form.responsable} onChange={set("responsable")}>
              <option value="">Sin responsable</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.nombre}
                </option>
              ))}
            </Select>
          </Field>
        </FormGrid>
        <Field label="Observaciones" htmlFor="m-obs">
          <Textarea id="m-obs" rows={3} value={form.observaciones} onChange={set("observaciones")} />
        </Field>
        <p className="rounded-[10px] bg-surface-2 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink-2 ring-1 ring-line">
          Mientras el mantenimiento esté <span className="font-medium">programado, en proceso o vencido</span>, el equipo se muestra “En mantenimiento” en la pestaña Equipos (con el detalle del pendiente debajo). Al marcarlo <span className="font-medium">completado</span> desaparece de Mantenimiento y el equipo vuelve a “Operativo”.
        </p>
      </form>
    </Sheet>
  );
}
