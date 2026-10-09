"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Overlay";
import { Skeleton } from "@/components/ui/Primitives";
import { useValidacion, ValidacionAmbito } from "@/components/ui/Validacion";
import { API_BASE_URL, ApiError, getJsonAuth, sendJsonAuth } from "@/lib/client/api";
import { msg, type Problema } from "@/lib/client/mensajes";
import { invalidate } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { normalizarEtiquetas } from "@/lib/shared/biblioteca";
import { CamposDocumento, reglasDatos, type DatosForm } from "./CamposDocumento";
import type { Categoria, RolOpcion } from "./comun";

/* Editar datos (titulo, categoria, clave, etiquetas, descripcion, fecha, visibilidad): documentos:E del propio o documentos:G. */
export function EditarSheet({ docId, onClose, categorias, roles }: { docId: number | null; onClose: () => void; categorias: Categoria[]; roles: RolOpcion[] | null }) {
  const { token } = useSession();
  const [titulo, setTitulo] = useState("");
  const [datos, setDatos] = useState<DatosForm | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!docId || !token) return;
    let cancelado = false;
    getJsonAuth(`${API_BASE_URL}/biblioteca/${docId}`, token)
      .then((data) => {
        if (cancelado) return;
        const d = data.item as ApiRecord;
        setTitulo(String(d.titulo || ""));
        setDatos({
          categoria_id: d.categoria_id ? String(d.categoria_id) : "",
          clave: String(d.clave || ""),
          etiquetas: (Array.isArray(d.etiquetas) ? d.etiquetas : []).join(", "),
          descripcion: String(d.descripcion || ""),
          fecha_documento: String(d.fecha_documento || ""),
          visibilidad: d.visibilidad === "roles" ? "roles" : "todos",
          roles: ((d.roles || []) as ApiRecord[]).map((r) => Number(r.id)),
        });
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "No se pudo cargar el documento");
        onClose();
      });
    return () => {
      cancelado = true;
    };
  }, [docId, token, onClose]);

  const v = useValidacion({
    titulo: "No se pudieron guardar los datos",
    reglas: (): Problema[] => (datos ? [...(titulo.trim() ? [] : [{ campo: "edit-titulo", mensaje: msg.indica("el título") }]), ...reglasDatos(datos, "edit")] : []),
  });

  const cerrar = () => {
    setDatos(null);
    setTitulo("");
    onClose();
  };

  const guardar = async () => {
    if (!docId || !datos || !v.validar()) return;
    setGuardando(true);
    try {
      await sendJsonAuth("PUT", `${API_BASE_URL}/biblioteca/${docId}`, token, {
        titulo: titulo.trim(),
        categoria_id: datos.categoria_id ? Number(datos.categoria_id) : null,
        clave: datos.clave.trim() || null,
        etiquetas: normalizarEtiquetas(datos.etiquetas),
        descripcion: datos.descripcion.trim() || null,
        fecha_documento: datos.fecha_documento || null,
        visibilidad: datos.visibilidad,
        roles: datos.visibilidad === "roles" ? datos.roles : [],
      });
      toast.success("Datos del documento actualizados");
      invalidate("biblioteca");
      cerrar();
    } catch (err) {
      const campo = err instanceof ApiError ? String(err.data?.campo || "") : "";
      const destino = campo === "titulo" ? "edit-titulo" : campo === "categoria" ? "edit-categoria" : campo === "roles" ? "edit-roles" : "";
      if (destino) v.avisar({ titulo: "No se pudieron guardar los datos", que: err instanceof Error ? err.message : "", problemas: [{ campo: destino, mensaje: err instanceof Error ? err.message : "Revisa este dato" }] });
      else v.errorServidor(err);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Sheet
      open={!!docId}
      onOpenChange={(o) => !o && cerrar()}
      title="Editar datos del documento"
      description="El archivo no cambia; para cambiarlo sube una versión nueva."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={cerrar}>
            Cancelar
          </Button>
          <Button loading={guardando} disabled={!datos} onClick={guardar}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <ValidacionAmbito v={v}>
        {datos ? (
          <div className="flex flex-col gap-5">
            <Field label="Título" htmlFor="edit-titulo" required>
              <Input id="edit-titulo" maxLength={220} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </Field>
            <CamposDocumento p="edit" datos={datos} onChange={(c) => setDatos((d) => (d ? { ...d, ...c } : d))} categorias={categorias} roles={roles} />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}
      </ValidacionAmbito>
    </Sheet>
  );
}
