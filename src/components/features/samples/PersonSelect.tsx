"use client";

import { useState } from "react";
import { Select, Input } from "@/components/ui/Field";
import { cn } from "@/components/ui/cn";
import { usePersonal, type Persona, type PersonaCapacidad } from "@/lib/client/personal";

/*
 * Selector de persona: lista al personal activo con la capacidad pedida
 * (capturar muestras, aprobar, informar...). "Otra persona…" deja escribir un
 * nombre libre (alumnos, personal externo). El valor guardado es el nombre.
 */
const OTHER = "__otra__";

export function PersonSelect({ id, value, onChange, requires, placeholder = "Seleccionar persona", className, allowOther = true, disabled }: { id?: string; value: string; onChange: (name: string, persona?: Persona) => void; requires?: PersonaCapacidad; placeholder?: string; className?: string; allowOther?: boolean; disabled?: boolean }) {
  const personal = usePersonal();
  const options = personal.filter((persona) => !requires || persona.puede[requires]);
  const known = options.some((persona) => persona.nombre === value);
  // "Otra persona" queda activa si el valor no es de la lista (p. ej. un registro viejo) o si se eligió a propósito.
  const [other, setOther] = useState(false);
  const showOther = allowOther && (other || (!!value && !known));
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Select
        id={id}
        value={showOther ? OTHER : value}
        disabled={disabled}
        onChange={(event) => {
          if (event.target.value === OTHER) {
            setOther(true);
            if (known) onChange("");
            return;
          }
          setOther(false);
          onChange(event.target.value, options.find((persona) => persona.nombre === event.target.value));
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((persona) => (
          <option key={persona.id} value={persona.nombre}>
            {persona.nombre}
            {persona.rol ? ` · ${persona.rol}` : ""}
          </option>
        ))}
        {allowOther ? <option value={OTHER}>Otra persona…</option> : null}
      </Select>
      {showOther ? <Input id={id ? `${id}-otra` : undefined} maxLength={180} placeholder="Nombre completo" value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} autoFocus={other} /> : null}
    </div>
  );
}
