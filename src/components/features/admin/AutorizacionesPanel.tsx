"use client";

/*
 * Autorizaciones del personal (FX-THF-AP, Fase 4): lista por persona y, para
 * quien las administra (ensayos:A o calidad:A, nunca sobre si mismo), alta y
 * revocacion con motivo y contrasena. Nada se borra: revocar la deja en la lista.
 */
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Prohibit } from "@phosphor-icons/react";
import { Callout, Panel } from "@/components/features/samples/FormLayout";
import { useValidacion, ValidacionAmbito } from "@/components/ui/Validacion";
import { msg, type Problema } from "@/lib/client/mensajes";
import { useSession } from "@/components/session/SessionProvider";
import { CampoIdentidad } from "@/components/session/Reautenticar";
import { Button } from "@/components/ui/Button";
import { DateInput } from "@/components/ui/DateInput";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/Field";
import { usePrompt } from "@/components/ui/Overlay";
import { Badge, Skeleton, type Tone } from "@/components/ui/Primitives";
import { API_BASE_URL, armarReauth, getJsonAuth, sendJsonAuth } from "@/lib/client/api";
import { invalidate } from "@/lib/client/store";
import { ETIQUETA_ESTADO_AUTORIZACION, TIPOS_AUTORIZACION, type AutorizacionPersonal, type EstadoAutorizacion } from "@/lib/shared/autorizaciones";
import { formatearFecha, formatearFechaHora, hoyLocal } from "@/lib/shared/fechas";

const TONO_ESTADO: Record<EstadoAutorizacion, Tone> = { vigente: "success", por_iniciar: "brand", vencida: "neutral", revocada: "danger" };
const ETIQUETA_TIPO: Record<string, string> = Object.fromEntries(TIPOS_AUTORIZACION.map((t) => [t.value, t.label]));

/* Lista de solo lectura (tambien la usa "Mi cuenta"). */
export function ListaAutorizaciones({ items, onRevocar }: { items: AutorizacionPersonal[]; onRevocar?: (a: AutorizacionPersonal) => void }) {
  if (!items.length) return <p className="text-[13px] text-ink-3">Sin autorizaciones registradas en FX-THF-AP.</p>;
  return (
    <ul className="flex flex-col divide-y divide-line rounded-card border border-line" aria-label="Autorizaciones FX-THF-AP">
      {items.map((a) => {
        const estado = (a.estado || "vigente") as EstadoAutorizacion;
        const revocable = !!onRevocar && (estado === "vigente" || estado === "por_iniciar");
        return (
          <li key={a.id} className="flex flex-wrap items-start gap-3 px-3 py-2.5" data-autorizacion={a.id}>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-ink">
                  {ETIQUETA_TIPO[a.tipo] ? `${ETIQUETA_TIPO[a.tipo]} · ` : ""}
                  {a.etiqueta || "Autorización"}
                </span>
                <Badge tone={TONO_ESTADO[estado]} dot>
                  {ETIQUETA_ESTADO_AUTORIZACION[estado]}
                </Badge>
              </div>
              <span className="text-[12.5px] text-ink-3">
                {estado === "por_iniciar" ? `Empieza el ${formatearFecha(a.vigente_desde)}` : `Desde el ${formatearFecha(a.vigente_desde)}`}
                {a.vigente_hasta ? `${estado === "vencida" ? " · venció el " : " · vigente hasta el "}${formatearFecha(a.vigente_hasta)}` : ", sin fecha de fin"}
                {a.folio_fx_thf_ap ? ` · formato ${a.folio_fx_thf_ap}` : ""}
              </span>
              {a.motivo ? <span className="whitespace-pre-line text-[12.5px] text-ink-2">Motivo: {a.motivo}</span> : null}
              {a.revocada_en ? (
                <span className="text-[12.5px] text-danger">
                  Revocada el {formatearFechaHora(a.revocada_en)}
                  {a.motivo_revocacion ? ` · ${a.motivo_revocacion}` : ""}
                </span>
              ) : null}
            </div>
            {revocable ? (
              <Button size="sm" variant="secondary" icon={<Prohibit size={14} />} onClick={() => onRevocar!(a)}>
                Revocar
              </Button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

type Catalogo = { actividades: Array<{ value: string; label: string }>; metodos: Array<{ value: string; label: string }>; equipos: Array<{ value: string; label: string }> };

/* Pestaña "Autorizaciones (FX-THF-AP)" de la ficha de un usuario. */
export function AutorizacionesUsuario({ usuarioId }: { usuarioId: number }) {
  const { token } = useSession();
  const prompt = usePrompt();
  const [items, setItems] = useState<AutorizacionPersonal[] | null>(null);
  const [puede, setPuede] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [nueva, setNueva] = useState({ tipo: "actividad", clave: "", desde: hoyLocal(), hasta: "", folio: "", motivo: "" });
  const [clave, setClave] = useState("");
  const [guardando, setGuardando] = useState(false);
  // El formulario de alta aparece al pulsar "Agregar".
  const [agregarAbierto, setAgregarAbierto] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const data = await getJsonAuth(`${API_BASE_URL}/admin/usuarios/${usuarioId}/autorizaciones`, token);
      setItems((data.items || []) as AutorizacionPersonal[]);
      setPuede(!!data.puede_administrar);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las autorizaciones");
    }
  }, [usuarioId, token]);

  useEffect(() => {
    // La carga se agenda como microtarea: el efecto solo dispara la sincronizacion.
    void Promise.resolve().then(cargar);
  }, [cargar]);

  useEffect(() => {
    if (!puede || catalogo) return;
    getJsonAuth(`${API_BASE_URL}/autorizaciones/catalogo`, token)
      .then((data) => setCatalogo(data as unknown as Catalogo))
      .catch(() => setCatalogo({ actividades: [], metodos: [], equipos: [] }));
  }, [puede, catalogo, token]);

  const opciones = !catalogo ? [] : nueva.tipo === "metodo" ? catalogo.metodos : nueva.tipo === "equipo" ? catalogo.equipos : catalogo.actividades;
  const queSe = nueva.tipo === "metodo" ? "el método" : nueva.tipo === "equipo" ? "el equipo" : "la actividad";
  const v = useValidacion({
    titulo: "No se pudo registrar la autorización",
    reglas: () => {
      const out: Problema[] = [];
      if (!nueva.clave) out.push({ campo: "aut-clave", mensaje: msg.elige(`${queSe} que se autoriza`) });
      if (nueva.desde && nueva.hasta && nueva.hasta < nueva.desde) out.push({ campo: "aut-hasta", mensaje: msg.fechaAnterior("La fecha de fin", "la de inicio") });
      if (nueva.motivo.trim().length < 5) out.push({ campo: "aut-motivo", mensaje: msg.minimo("El motivo", 5) });
      return out;
    },
  });

  const agregar = async () => {
    if (!v.validar()) return;
    armarReauth(clave ? { password: clave } : null);
    setGuardando(true);
    try {
      const data = await sendJsonAuth("POST", `${API_BASE_URL}/admin/usuarios/${usuarioId}/autorizaciones`, token, {
        tipo: nueva.tipo,
        clave: nueva.clave,
        vigente_desde: nueva.desde || null,
        vigente_hasta: nueva.hasta || null,
        folio_fx_thf_ap: nueva.folio.trim() || null,
        motivo: nueva.motivo.trim(),
      });
      toast.success(String(data.message || "Autorización registrada"));
      setNueva((prev) => ({ ...prev, clave: "", hasta: "", motivo: "" }));
      setClave("");
      setAgregarAbierto(false);
      await cargar();
      invalidate("dashboard");
    } catch (err) {
      v.errorServidor(err, { motivo: "aut-motivo", password: "aut-clave-admin" });
    } finally {
      setGuardando(false);
    }
  };

  const revocar = async (a: AutorizacionPersonal) => {
    const motivo = await prompt({ critico: true, title: `Revocar "${a.etiqueta || a.clave}"`, description: "La autorización queda en la lista como revocada y deja de contar de inmediato.", label: "Motivo", minLength: 5, confirmLabel: "Revocar", tone: "danger" });
    if (!motivo) return;
    try {
      await sendJsonAuth("POST", `${API_BASE_URL}/admin/usuarios/${usuarioId}/autorizaciones/${a.id}/revocar`, token, { motivo });
      toast.success("Autorización revocada");
      await cargar();
      invalidate("dashboard");
    } catch (err) {
      v.errorServidor(err);
    }
  };

  if (error) return <Callout tone="danger">{error}</Callout>;
  if (!items) return <Skeleton className="h-24 w-full" />;

  return (
    <ValidacionAmbito v={v}>
    <div className="flex flex-col gap-3" id="autorizaciones-usuario">
      <p className="text-[13px] text-ink-3">Además del rol, la persona solo puede trabajar con los métodos, equipos y actividades para los que está autorizada (formato FX-THF-AP), mientras la autorización esté vigente.</p>
      <ListaAutorizaciones items={items} onRevocar={puede ? revocar : undefined} />
      {puede && !agregarAbierto ? (
        <div>
          <Button size="sm" icon={<Plus size={14} weight="bold" />} onClick={() => setAgregarAbierto(true)}>
            Agregar
          </Button>
        </div>
      ) : null}
      {puede && agregarAbierto ? (
        <Panel title="Agregar autorización" description="La registra quien aprueba en ensayos o calidad; nadie se autoriza a sí mismo. Queda en la bitácora con su motivo.">
          <FormGrid>
            <Field label="Tipo" htmlFor="aut-tipo" required>
              <Select id="aut-tipo" value={nueva.tipo} onChange={(event) => setNueva((prev) => ({ ...prev, tipo: event.target.value, clave: "" }))}>
                {TIPOS_AUTORIZACION.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={nueva.tipo === "metodo" ? "Método" : nueva.tipo === "equipo" ? "Equipo" : "Actividad"} htmlFor="aut-clave" required hint={nueva.tipo === "equipo" && catalogo && !catalogo.equipos.length ? "No hay equipos activos en el inventario." : undefined}>
              <Select id="aut-clave" value={nueva.clave} onChange={(event) => setNueva((prev) => ({ ...prev, clave: event.target.value }))}>
                <option value="">Seleccionar</option>
                {opciones.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Vigente desde" htmlFor="aut-desde">
              <DateInput id="aut-desde" value={nueva.desde} onChange={(value) => setNueva((prev) => ({ ...prev, desde: value }))} />
            </Field>
            <Field label="Vigente hasta" htmlFor="aut-hasta" hint="Opcional">
              <DateInput id="aut-hasta" value={nueva.hasta} onChange={(value) => setNueva((prev) => ({ ...prev, hasta: value }))} />
            </Field>
            <Field label="Folio FX-THF-AP" htmlFor="aut-folio" hint="Folio del formato en papel">
              <Input id="aut-folio" maxLength={80} value={nueva.folio} onChange={(event) => setNueva((prev) => ({ ...prev, folio: event.target.value }))} />
            </Field>
            <Field label="Motivo" htmlFor="aut-motivo" required>
              <Textarea id="aut-motivo" rows={2} maxLength={300} value={nueva.motivo} onChange={(event) => setNueva((prev) => ({ ...prev, motivo: event.target.value }))} placeholder="Ej. Evaluación de competencia aprobada" />
            </Field>
          </FormGrid>
          <CampoIdentidad value={clave} onChange={setClave} id="aut-clave-admin" />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setAgregarAbierto(false)}>
              Cancelar
            </Button>
            <Button icon={<Plus size={14} weight="bold" />} onClick={agregar} loading={guardando} id="aut-agregar">
              Agregar
            </Button>
          </div>
        </Panel>
      ) : null}
    </div>
    </ValidacionAmbito>
  );
}
