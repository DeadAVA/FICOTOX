"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PencilSimple } from "@phosphor-icons/react";
import { Callout } from "@/components/features/samples/FormLayout";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, FormGrid, Input, Textarea } from "@/components/ui/Field";
import { Dialog, usePrompt } from "@/components/ui/Overlay";
import { Badge, Skeleton } from "@/components/ui/Primitives";
import { VentanaCentrada, VentanaTitulo } from "@/components/ui/VentanaCentrada";
import { useValidacion, ValidacionAmbito } from "@/components/ui/Validacion";
import { API_BASE_URL, getJsonAuth, sendJsonAuth } from "@/lib/client/api";
import { msg } from "@/lib/client/mensajes";
import { ACCIONES_LEGIBLES, ALCANCES_LEGIBLES, AREAS_PERMISOS, quepuedeHacer } from "@/lib/client/permisos-legibles";
import { invalidate } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { REGLAS_COMBINACION } from "@/lib/shared/combinaciones-roles";
import { HIDDEN_MODULES } from "@/lib/shared/features";
import { ACCION_KEYS, ALCANCES, firmaFilas, type PermisoFila } from "@/lib/shared/permisos";

/*
 * Ventana de un rol (Administración › Roles), con la misma ventana centrada de
 * Auditoría: nombre, descripción y estado; "Qué puede hacer" por área en
 * palabras; las personas con el rol; y "Editar permisos", que abre el editor
 * en la misma ventana, ampliada, con columnas y alcances en palabras. Las
 * validaciones son las de siempre (motivo, reautenticación, combinaciones
 * prohibidas y rol propio en solo lectura).
 */

type Detalle = { role: ApiRecord; permisos: PermisoFila[]; usuarios: ApiRecord[] };

export async function cargarRol(id: number, token: string): Promise<Detalle> {
  const data = await getJsonAuth(`${API_BASE_URL}/admin/roles/${id}`, token);
  return { role: (data.role || {}) as ApiRecord, permisos: (data.permisos || []) as PermisoFila[], usuarios: (data.usuarios || []) as ApiRecord[] };
}

/* Guarda el rol con todos sus datos (el servidor siempre recibe la matriz completa). */
export async function guardarRol(token: string, role: ApiRecord, cambios: { nombre?: string; descripcion?: string; activo?: boolean; permisos: PermisoFila[]; motivo?: string | null }) {
  return sendJsonAuth("PUT", `${API_BASE_URL}/admin/roles/${role.id}`, token, {
    nombre: cambios.nombre ?? String(role.nombre || ""),
    descripcion: cambios.descripcion ?? String(role.descripcion || ""),
    activo: cambios.activo ?? !!role.activo,
    permisos: cambios.permisos,
    ...(cambios.motivo ? { motivo: cambios.motivo } : {}),
  });
}

export function RolVentana({ roles, indice, editar, onIndice, onEditar, onCerrar }: { roles: ApiRecord[]; indice: number | null; editar: boolean; onIndice: (indice: number) => void; onEditar: (editar: boolean) => void; onCerrar: () => void }) {
  const role = indice !== null ? roles[indice] : undefined;
  const mover = (paso: number) => {
    if (indice === null) return;
    const siguiente = indice + paso;
    if (siguiente >= 0 && siguiente < roles.length) onIndice(siguiente);
  };
  return (
    <VentanaCentrada abierta={!!role} onCerrar={onCerrar} onMover={editar ? undefined : mover} puedeAnterior={indice !== null && indice > 0} puedeSiguiente={indice !== null && indice < roles.length - 1} amplia={editar} etiquetaAnterior="Rol anterior" etiquetaSiguiente="Rol siguiente">
      {role ? <FichaRol key={String(role.id)} id={Number(role.id)} editar={editar} onEditar={onEditar} onCerrar={onCerrar} /> : <VentanaTitulo className="sr-only">Rol</VentanaTitulo>}
    </VentanaCentrada>
  );
}

function FichaRol({ id, editar, onEditar, onCerrar }: { id: number; editar: boolean; onEditar: (editar: boolean) => void; onCerrar: () => void }) {
  const { token, can, roles: rolesSesion } = useSession();
  const router = useRouter();
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cargar = useCallback(async () => {
    try {
      setDetalle(await cargarRol(id, token));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el rol");
    }
  }, [id, token]);
  useEffect(() => {
    void Promise.resolve().then(cargar);
  }, [cargar]);

  const rolPropio = rolesSesion.some((rol) => Number(rol.id) === id);
  const puedeEditar = can("usuarios", "G") && !rolPropio;

  if (error) return <Callout tone="danger" title="No se pudo abrir el rol">{error}</Callout>;
  if (!detalle) {
    return (
      <div className="flex flex-col gap-3">
        <VentanaTitulo className="sr-only">Rol</VentanaTitulo>
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  const { role, permisos, usuarios } = detalle;
  const puede = quepuedeHacer(permisos);

  return (
    <div className="flex flex-col gap-6" data-rol-ventana={String(id)}>
      <header className="flex flex-col gap-1.5">
        <VentanaTitulo>{String(role.nombre || "Rol")}</VentanaTitulo>
        {role.descripcion ? <p className="text-[14px] text-ink-2">{String(role.descripcion)}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={role.activo ? "success" : "neutral"} dot>
            {role.activo ? "Activo" : "Inactivo"}
          </Badge>
          {role.es_sistemico ? <Badge tone="neutral">Del sistema</Badge> : null}
        </div>
      </header>

      {editar && puedeEditar ? (
        <EditorPermisos
          role={role}
          iniciales={permisos}
          onCancelar={() => onEditar(false)}
          onGuardado={async () => {
            await cargar();
            onEditar(false);
          }}
        />
      ) : (
        <>
          {editar && rolPropio ? <Callout tone="warning" title="No puedes editar un rol que tienes asignado">Sus permisos los debe cambiar otra persona que administre usuarios.</Callout> : null}
          <section className="flex flex-col gap-2">
            <h3 className="text-[13px] font-semibold text-ink-2">Qué puede hacer</h3>
            {puede.length ? (
              <ul className="flex flex-col gap-1.5 text-[14px] leading-[1.5] text-ink">
                {puede.map((p) => (
                  <li key={p.area}>
                    <span className="font-medium">{p.area}:</span> {p.frase}.
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-ink-3">Este rol todavía no tiene permisos: quien lo tenga no verá nada.</p>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-[13px] font-semibold text-ink-2">Personas con este rol</h3>
            {usuarios.length ? (
              <ul className="flex flex-wrap gap-1.5">
                {usuarios.map((u) => (
                  <li key={String(u.id)}>
                    <button
                      type="button"
                      onClick={() => {
                        onCerrar();
                        router.push(`/administracion/usuarios?abrir=${encodeURIComponent(String(u.id))}`);
                      }}
                      className="press inline-flex h-8 items-center rounded-full bg-surface-2 px-3 text-[13px] text-ink ring-1 ring-line hover:bg-brand-faint"
                    >
                      {String(u.nombre || u.email)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-ink-3">Nadie tiene este rol.</p>
            )}
          </section>

          {puedeEditar ? (
            <div>
              <Button icon={<PencilSimple size={15} />} onClick={() => onEditar(true)}>
                Editar permisos
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

/* ---------- Editor de permisos (matriz con etiquetas legibles) ---------- */

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
  for (const area of AREAS_PERMISOS) {
    for (const accion of ACCION_KEYS) {
      const alcance = matriz[celda(area.clave, accion)];
      if (alcance) filas.push({ modulo: area.clave as PermisoFila["modulo"], accion, alcance: alcance as PermisoFila["alcance"] });
    }
  }
  return filas;
}

function EditorPermisos({ role, iniciales, onCancelar, onGuardado }: { role: ApiRecord; iniciales: PermisoFila[]; onCancelar: () => void; onGuardado: () => Promise<void> }) {
  const { token } = useSession();
  const prompt = usePrompt();
  const [matriz, setMatriz] = useState<Matriz>(() => matrizDesdeFilas(iniciales));
  const [guardando, setGuardando] = useState(false);
  const v = useValidacion({ titulo: "No se pudieron guardar los permisos", reglas: () => [] });
  const areas = AREAS_PERMISOS.filter((a) => !HIDDEN_MODULES.has(a.clave as never) || Object.keys(matriz).some((k) => k.startsWith(`${a.clave}:`) && matriz[k]));

  const toggle = (modulo: string, accion: string, checked: boolean) => setMatriz((prev) => ({ ...prev, [celda(modulo, accion)]: checked ? prev[celda(modulo, accion)] || "total" : null }));
  const setAlcance = (modulo: string, accion: string, alcance: string) => setMatriz((prev) => ({ ...prev, [celda(modulo, accion)]: alcance }));

  const guardar = async () => {
    const permisos = filasDesdeMatriz(matriz);
    if (firmaFilas(iniciales) === firmaFilas(permisos)) {
      onCancelar();
      return;
    }
    const motivo = await prompt({ critico: true, title: "Motivo del cambio de permisos", description: "Queda en la bitácora junto con los permisos de antes y de después.", label: "Motivo", minLength: 5, confirmLabel: "Guardar permisos" });
    if (!motivo) return;
    setGuardando(true);
    try {
      await guardarRol(token, role, { permisos, motivo });
      toast.success("Permisos actualizados");
      invalidate("roles", "usuarios");
      await onGuardado();
    } catch (err) {
      v.errorServidor(err);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ValidacionAmbito v={v}>
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-[15px] font-semibold text-ink">Editar permisos</h3>
          <p className="text-[13px] text-ink-3">Marca qué puede hacer el rol en cada área y hasta dónde. Crear, editar, revisar, aprobar y anular incluyen ver; administrar lo incluye todo. Lo que no se marca, no se concede.</p>
        </div>
        <div className="overflow-x-auto rounded-[14px] ring-1 ring-line">
          <table className="w-full min-w-[900px] text-[13px]">
            <thead className="bg-surface-2/70 text-[12px] text-ink-3">
              <tr>
                <th className="h-9 px-3 text-left font-medium">Área</th>
                {ACCION_KEYS.map((accion) => (
                  <th key={accion} className="h-9 px-1 text-center font-medium">
                    {ACCIONES_LEGIBLES[accion].columna}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {areas.map((area) => (
                <tr key={area.clave} className="align-top hover:bg-surface-2/40">
                  <td className="px-3 py-2">
                    <div className="font-medium text-ink">{area.nombre}</div>
                    <div className="text-[11.5px] text-ink-3">{area.detalle}</div>
                  </td>
                  {ACCION_KEYS.map((accion) => {
                    const alcance = matriz[celda(area.clave, accion)] || null;
                    const nombre = `${ACCIONES_LEGIBLES[accion].columna} en ${area.nombre}`;
                    return (
                      <td key={accion} className="px-1 py-2 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Checkbox className="inline-flex" aria-label={nombre} checked={!!alcance} onChange={(event) => toggle(area.clave, accion, event.target.checked)} />
                          {alcance ? (
                            <select aria-label={`Hasta dónde: ${nombre}`} value={alcance} onChange={(event) => setAlcance(area.clave, accion, event.target.value)} className="w-[104px] rounded-[6px] border border-line bg-surface px-1 py-0.5 text-[11px] text-ink-2">
                              {ALCANCES.map((a) => (
                                <option key={a.clave} value={a.clave}>
                                  {ALCANCES_LEGIBLES[a.clave]?.opcion || a.nombre}
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
        <Callout tone="info" title="Combinaciones de roles prohibidas">
          Al guardar se revisa que nadie con este rol quede con una combinación prohibida; si pasa, el cambio no se guarda y se dice a quién afecta.
          <ul className="mt-1.5 list-disc pl-4">
            {REGLAS_COMBINACION.map((regla) => (
              <li key={regla.numero}>{regla.titulo}</li>
            ))}
          </ul>
        </Callout>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button loading={guardando} onClick={guardar}>
            Guardar permisos
          </Button>
        </div>
      </div>
    </ValidacionAmbito>
  );
}

/* ---------- Nombre y descripción (alta de un rol nuevo o cambio de nombre) ---------- */

export function DatosRolDialog({ role, onCerrar }: { role: ApiRecord | null; onCerrar: () => void }) {
  const { token } = useSession();
  const [nombre, setNombre] = useState(String(role?.nombre || ""));
  const [descripcion, setDescripcion] = useState(String(role?.descripcion || ""));
  const [guardando, setGuardando] = useState(false);
  const editando = !!role?.id;
  const v = useValidacion({
    titulo: editando ? "No se pudo guardar el rol" : "No se pudo crear el rol",
    reglas: () => (nombre.trim() ? [] : [{ campo: "role-nombre", mensaje: msg.indica("el nombre del rol") }]),
  });
  const guardar = async () => {
    if (!v.validar()) return;
    setGuardando(true);
    try {
      if (editando) {
        // Solo cambian el nombre y la descripcion: se envian los permisos actuales tal cual.
        const actual = await cargarRol(Number(role!.id), token);
        await guardarRol(token, actual.role, { nombre: nombre.trim(), descripcion: descripcion.trim(), permisos: actual.permisos });
        toast.success("Rol actualizado");
      } else {
        await sendJsonAuth("POST", `${API_BASE_URL}/admin/roles`, token, { nombre: nombre.trim(), descripcion: descripcion.trim(), activo: true, permisos: [] });
        toast.success("Rol creado: ahora define sus permisos");
      }
      invalidate("roles", "usuarios");
      onCerrar();
    } catch (err) {
      v.errorServidor(err, { motivo: "role-nombre" });
    } finally {
      setGuardando(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onCerrar()}
      title={editando ? "Editar nombre y descripción" : "Nuevo rol"}
      description={editando ? undefined : "Después de crearlo, define qué puede hacer con «Editar permisos»."}
      footer={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button loading={guardando} onClick={guardar}>
            {editando ? "Guardar" : "Crear rol"}
          </Button>
        </>
      }
    >
      <ValidacionAmbito v={v}>
        <FormGrid>
          <Field label="Nombre" htmlFor="role-nombre" required className="sm:col-span-2">
            <Input id="role-nombre" maxLength={100} value={nombre} onChange={(event) => setNombre(event.target.value)} autoFocus />
          </Field>
          <Field label="Descripción" htmlFor="role-descripcion" className="sm:col-span-2">
            <Textarea id="role-descripcion" rows={2} value={descripcion} onChange={(event) => setDescripcion(event.target.value)} />
          </Field>
        </FormGrid>
      </ValidacionAmbito>
    </Dialog>
  );
}
