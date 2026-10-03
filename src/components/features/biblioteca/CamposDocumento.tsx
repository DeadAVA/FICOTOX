"use client";

import { Checkbox, Field, FormGrid, Input, Select, Textarea } from "@/components/ui/Field";
import { DateInput } from "@/components/ui/DateInput";
import { CampoValidado } from "@/components/ui/Validacion";
import type { Problema } from "@/lib/client/mensajes";
import type { Categoria, RolOpcion } from "./comun";

/* Datos de un documento que se capturan al subir y al editar. */
export interface DatosForm {
  categoria_id: string;
  clave: string;
  etiquetas: string;
  descripcion: string;
  fecha_documento: string;
  visibilidad: "todos" | "roles";
  roles: number[];
}

export const datosVacios = (categoria = ""): DatosForm => ({ categoria_id: categoria, clave: "", etiquetas: "", descripcion: "", fecha_documento: "", visibilidad: "todos", roles: [] });

/* Reglas comunes (visibilidad por roles). `p` es el prefijo de los ids (bib, edit). */
export function reglasDatos(d: DatosForm, p: string): Problema[] {
  return d.visibilidad === "roles" && !d.roles.length ? [{ campo: `${p}-roles`, mensaje: "Elige al menos un rol que pueda verlo", grupo: "Visibilidad" }] : [];
}

export function CamposDocumento({
  p,
  datos,
  onChange,
  categorias,
  roles,
  conClave = true,
  conFecha = true,
}: {
  p: string;
  datos: DatosForm;
  onChange: (cambios: Partial<DatosForm>) => void;
  categorias: Categoria[];
  /* null: la persona no puede leer el catalogo de roles (solo "todos"). */
  roles: RolOpcion[] | null;
  conClave?: boolean;
  conFecha?: boolean;
}) {
  const activas = categorias.filter((c) => Number(c.activa) || String(c.id) === datos.categoria_id);
  return (
    <div className="flex flex-col gap-5">
      <FormGrid>
        <Field label="Categoría" htmlFor={`${p}-categoria`}>
          <Select id={`${p}-categoria`} value={datos.categoria_id} onChange={(e) => onChange({ categoria_id: e.target.value })}>
            <option value="">Sin categoría</option>
            {activas.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.nombre}
              </option>
            ))}
          </Select>
        </Field>
        {conClave ? (
          <Field label="Clave" htmlFor={`${p}-clave`} hint="Opcional, p. ej. FX-TCI-CE1.">
            <Input id={`${p}-clave`} mono maxLength={60} value={datos.clave} onChange={(e) => onChange({ clave: e.target.value })} />
          </Field>
        ) : null}
        <Field label="Etiquetas" htmlFor={`${p}-etiquetas`} hint="Separadas por coma: toxinas, HPLC, ASP." className={conClave ? "" : "sm:col-span-1"}>
          <Input id={`${p}-etiquetas`} maxLength={400} value={datos.etiquetas} onChange={(e) => onChange({ etiquetas: e.target.value })} />
        </Field>
        {conFecha ? (
          <Field label="Fecha del documento" htmlFor={`${p}-fecha`} hint="Opcional.">
            <DateInput id={`${p}-fecha`} value={datos.fecha_documento} onChange={(value) => onChange({ fecha_documento: value })} />
          </Field>
        ) : null}
      </FormGrid>
      <Field label="Descripción" htmlFor={`${p}-descripcion`}>
        <Textarea id={`${p}-descripcion`} rows={2} maxLength={4000} value={datos.descripcion} onChange={(e) => onChange({ descripcion: e.target.value })} />
      </Field>
      <Field label="Visibilidad" htmlFor={`${p}-visibilidad`} hint={roles === null ? "Para restringirlo a ciertos roles se necesita leer el catálogo de roles." : undefined}>
        <Select id={`${p}-visibilidad`} value={datos.visibilidad} onChange={(e) => onChange({ visibilidad: e.target.value === "roles" ? "roles" : "todos" })}>
          <option value="todos">Todos los que ven la biblioteca</option>
          <option value="roles" disabled={roles === null}>
            Solo algunos roles
          </option>
        </Select>
      </Field>
      {datos.visibilidad === "roles" && roles ? (
        <CampoValidado id={`${p}-roles`} className="flex flex-col gap-2 p-1">
          <p className="text-[13px] font-medium text-ink-2">Roles que pueden verlo</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {roles.map((r) => (
              <Checkbox key={r.id} label={r.nombre} checked={datos.roles.includes(r.id)} onChange={(e) => onChange({ roles: e.target.checked ? [...datos.roles, r.id] : datos.roles.filter((x) => x !== r.id) })} />
            ))}
          </div>
        </CampoValidado>
      ) : null}
    </div>
  );
}
