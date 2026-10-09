"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "@phosphor-icons/react";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input, Switch } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Overlay";
import { useValidacion, ValidacionAmbito } from "@/components/ui/Validacion";
import { API_BASE_URL, ApiError, sendJsonAuth } from "@/lib/client/api";
import { msg } from "@/lib/client/mensajes";
import { invalidate } from "@/lib/client/store";
import type { Categoria } from "./comun";

/*
 * Categorias de la biblioteca (documentos:G). No se borran: se desactivan y
 * sus documentos la conservan. Cada cambio queda en la bitacora.
 */
export function CategoriasSheet({ open, onClose, categorias }: { open: boolean; onClose: () => void; categorias: Categoria[] }) {
  const { token } = useSession();
  const [nueva, setNueva] = useState("");
  const [edicion, setEdicion] = useState<Record<number, string>>({});
  const [ocupado, setOcupado] = useState(false);

  const v = useValidacion({ titulo: "No se pudo crear la categoría", reglas: () => (nueva.trim() ? [] : [{ campo: "cat-nueva", mensaje: msg.indica("el nombre de la categoría") }]) });

  const fallo = (err: unknown, campo: string) => {
    if (err instanceof ApiError && err.data?.campo === "nombre") v.avisar({ titulo: "No se pudo guardar la categoría", que: err.message, problemas: [{ campo, mensaje: err.message }] });
    else v.errorServidor(err);
  };

  const crear = async () => {
    if (!v.validar()) return;
    setOcupado(true);
    try {
      await sendJsonAuth("POST", `${API_BASE_URL}/biblioteca/categorias`, token, { nombre: nueva.trim() });
      toast.success("Categoría creada");
      setNueva("");
      invalidate("biblioteca");
    } catch (err) {
      fallo(err, "cat-nueva");
    } finally {
      setOcupado(false);
    }
  };

  const guardar = async (c: Categoria, cambios: { nombre?: string; orden?: number; activa?: boolean }) => {
    setOcupado(true);
    try {
      await sendJsonAuth("PUT", `${API_BASE_URL}/biblioteca/categorias/${c.id}`, token, cambios);
      invalidate("biblioteca");
      setEdicion((e) => {
        const { [c.id]: _x, ...resto } = e;
        void _x;
        return resto;
      });
    } catch (err) {
      fallo(err, `cat-nombre-${c.id}`);
    } finally {
      setOcupado(false);
    }
  };

  const ordenadas = [...categorias].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()} title="Categorías de la biblioteca" description="Ordena, renombra o desactiva categorías. Una categoría desactivada ya no se ofrece al subir; sus documentos la conservan.">
      <ValidacionAmbito v={v}>
        <div className="flex flex-col gap-5">
          <ul className="flex flex-col gap-2" aria-label="Categorías">
            {ordenadas.map((c, i) => {
              const nombre = edicion[c.id] ?? c.nombre;
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-[12px] bg-surface-2 px-3 py-2.5 ring-1 ring-line">
                  <Input
                    id={`cat-nombre-${c.id}`}
                    small
                    className="min-w-0 flex-1"
                    value={nombre}
                    maxLength={80}
                    aria-label={`Nombre de la categoría ${c.nombre}`}
                    onChange={(e) => setEdicion((ed) => ({ ...ed, [c.id]: e.target.value }))}
                    onBlur={() => nombre.trim() && nombre.trim() !== c.nombre && void guardar(c, { nombre: nombre.trim() })}
                  />
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" disabled={ocupado || i === 0} onClick={() => void guardar(c, { orden: ordenadas[i - 1].orden - 1 })} aria-label={`Subir ${c.nombre}`}>
                      ↑
                    </Button>
                    <Button size="sm" variant="ghost" disabled={ocupado || i === ordenadas.length - 1} onClick={() => void guardar(c, { orden: ordenadas[i + 1].orden + 1 })} aria-label={`Bajar ${c.nombre}`}>
                      ↓
                    </Button>
                  </div>
                  <Switch checked={!!Number(c.activa)} onCheckedChange={(on) => void guardar(c, { activa: on })} label={<span className="text-[12.5px] font-normal text-ink-2">Activa</span>} disabled={ocupado} />
                </li>
              );
            })}
          </ul>
          <div className="flex items-end gap-2">
            <Field label="Nueva categoría" htmlFor="cat-nueva" className="flex-1">
              <Input id="cat-nueva" maxLength={80} value={nueva} onChange={(e) => setNueva(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void crear()} />
            </Field>
            <Button icon={<Plus size={15} weight="bold" />} loading={ocupado} onClick={crear}>
              Agregar
            </Button>
          </div>
        </div>
      </ValidacionAmbito>
    </Sheet>
  );
}
