"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowCounterClockwise, Copy, Key, LockOpen, PencilSimple, Plus, Trash, Users } from "@phosphor-icons/react";
import { UserSheet } from "@/components/features/admin/AdminSheets";
import { estadoCuenta, Iniciales, ultimoAcceso, UsuarioVentana } from "@/components/features/admin/UsuarioVentana";
import { SolicitudBadge } from "@/components/features/samples/status";
import { PageBody } from "@/components/shell/AppShell";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { FilterMenu, type FilterGroup, type FilterToggle } from "@/components/ui/FilterMenu";
import { ActionMenu, Dialog, usePrompt, type MenuItem } from "@/components/ui/Overlay";
import { PageHeader, SearchInput, SegmentedTabs, Toolbar } from "@/components/ui/PageHeader";
import { Badge, EmptyState, ErrorState, Skeleton } from "@/components/ui/Primitives";
import { cn } from "@/components/ui/cn";
import { useValidacion, ValidacionAmbito } from "@/components/ui/Validacion";
import { API_BASE_URL, getJsonAuth, resolveApiEntity, sendJsonAuth } from "@/lib/client/api";
import { fmt, normalizeText } from "@/lib/client/format";
import { useOpenState } from "@/lib/client/hooks";
import { invalidate, useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { formatearFecha, formatearHora, hoyLocal, sumarDias } from "@/lib/shared/fechas";

/*
 * Usuarios (minimalista): una lista sencilla (iniciales, nombre y correo, roles
 * vigentes, estado, ultimo acceso y solicitud pendiente) y, al pulsar una
 * persona, su ventana centrada (General, Roles y Autorizaciones). Integra lo
 * que era "Revision de accesos": accesos rapidos arriba de la lista, filtros de
 * vigencia y bloqueos, temporales con su supervisor. Sin exportacion. Las
 * acciones y sus reglas no cambian.
 */

export default function UsuariosPage() {
  return (
    <PageBody>
      <PageHeader title="Usuarios" description="Las personas que entran a la plataforma, sus roles y sus autorizaciones. Las cuentas no se eliminan: se dan de baja con motivo." />
      <RequireModule modules="usuarios">
        {/* Los avisos del Inicio y la campana llegan con un filtro en la URL (?vigencia=vence7). */}
        <Suspense fallback={null}>
          <UsuariosContent />
        </Suspense>
      </RequireModule>
    </PageBody>
  );
}

type EstadoFiltro = "" | "activos" | "baja" | "bloqueados";
type TipoFiltro = "" | "permanente" | "temporal";
type VigenciaFiltro = "" | "vence7" | "vencido";
type Orden = "nombre" | "acceso" | "alta";

/* Fecha de fin mas cercana de la cuenta o de sus roles vigentes. */
const vencimientos = (item: ApiRecord): string[] => [item.vigente_hasta, ...((item.roles || []) as ApiRecord[]).map((r) => r.vigente_hasta)].filter(Boolean).map(String);
const venceEnSemana = (item: ApiRecord, hoy: string) => !!item.activo && vencimientos(item).some((f) => f >= hoy && f <= sumarDias(hoy, 7));

function UsuariosContent() {
  const { token, can, user: me, alcance } = useSession();
  const prompt = usePrompt();
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<EstadoFiltro>(() => (params.get("estado") as EstadoFiltro) || "");
  const [tipo, setTipo] = useState<TipoFiltro>(() => (params.get("tipo") as TipoFiltro) || "");
  const [vigencia, setVigencia] = useState<VigenciaFiltro>(() => (params.get("vigencia") as VigenciaFiltro) || "");
  const [rol, setRol] = useState("");
  const [conSolicitudes, setConSolicitudes] = useState(() => params.get("solicitudes") === "1");
  const [sinRoles, setSinRoles] = useState(false);
  const [sinAutorizaciones, setSinAutorizaciones] = useState(false);
  const [orden, setOrden] = useState<Orden>("nombre");
  const [abierta, setAbierta] = useState<number | null>(null);
  // Desde la ventana de un rol: /administracion/usuarios?abrir=<id> abre la ventana de esa persona.
  const [abrirPendiente, setAbrirPendiente] = useState<string | null>(() => params.get("abrir"));
  const modal = useOpenState<ApiRecord>();
  // Contrasena temporal recien generada: se muestra una sola vez.
  const [temporal, setTemporal] = useState<{ email: string; password: string } | null>(null);
  const hoy = hoyLocal();

  const resource = useResource<ApiRecord[]>(
    "usuarios",
    async () => {
      const data = await getJsonAuth(`${API_BASE_URL}/admin/usuarios`, token);
      return (data.items || []) as ApiRecord[];
    },
    { enabled: !!token },
  );
  const items = useMemo(() => resource.data || [], [resource.data]);
  const roles = useMemo(() => Array.from(new Set(items.flatMap((item) => ((item.roles || []) as ApiRecord[]).map((r) => String(r.nombre || ""))).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [items]);

  const rows = useMemo(() => {
    const term = normalizeText(search);
    const lista = items.filter((item) => {
      if (term && !normalizeText(`${item.nombre || ""} ${item.email || ""}`).includes(term)) return false;
      if (estado === "activos" && !item.activo) return false;
      if (estado === "baja" && item.activo) return false;
      if (estado === "bloqueados" && !item.bloqueado_hasta) return false;
      if (tipo && String(item.tipo_cuenta || "permanente") !== tipo) return false;
      if (vigencia === "vence7" && !venceEnSemana(item, hoy)) return false;
      if (vigencia === "vencido" && !(item.activo && item.cuenta_vigente === false)) return false;
      if (rol && !((item.roles || []) as ApiRecord[]).some((r) => r.nombre === rol)) return false;
      if (conSolicitudes && !item.solicitud_pendiente) return false;
      if (sinRoles && ((item.roles || []) as ApiRecord[]).length) return false;
      if (sinAutorizaciones && Number(item.autorizaciones_vigentes || 0) > 0) return false;
      return true;
    });
    const nombre = (i: ApiRecord) => String(i.nombre || i.email || "");
    if (orden === "nombre") return lista.sort((a, b) => nombre(a).localeCompare(nombre(b), "es"));
    if (orden === "acceso") return lista.sort((a, b) => String(b.ultimo_acceso || "").localeCompare(String(a.ultimo_acceso || "")));
    return lista.sort((a, b) => String(b.creado_en || "").localeCompare(String(a.creado_en || "")));
  }, [items, search, estado, tipo, vigencia, rol, conSolicitudes, sinRoles, sinAutorizaciones, orden, hoy]);

  // Errores de las acciones (motivo y contraseña ya capturados): pop-up con qué pasó y qué hacer.
  const vAccion = useValidacion({ titulo: "No se pudo completar la acción", reglas: () => [] });
  const editUser = async (id: number) => {
    try {
      const data = await getJsonAuth(`${API_BASE_URL}/admin/usuarios/${id}`, token);
      modal.open(resolveApiEntity(data));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cargar el usuario");
    }
  };

  // Las cuentas no se eliminan: se dan de baja (inactivas) con motivo y su historial se conserva.
  const darDeBaja = async (item: ApiRecord) => {
    const motivo = await prompt({ critico: true, title: `Dar de baja a ${item.nombre || item.email}`, description: "La cuenta queda inactiva y no puede entrar; los registros y la bitácora que la citan se conservan.", confirmLabel: "Dar de baja", tone: "danger" });
    if (!motivo) return;
    try {
      await sendJsonAuth("DELETE", `${API_BASE_URL}/admin/usuarios/${item.id}`, token, { motivo });
      toast.success("Cuenta dada de baja");
      invalidate("usuarios", "roles");
    } catch (err) {
      vAccion.errorServidor(err);
    }
  };

  // Reactivar: la aprueba un segundo usuario (como al marcarla activa en la edición).
  const reactivar = async (item: ApiRecord) => {
    const motivo = await prompt({ critico: true, title: `Reactivar a ${item.nombre || item.email}`, description: "La cuenta vuelve a poder entrar cuando otra persona autorizada apruebe la solicitud.", confirmLabel: "Pedir reactivación" });
    if (!motivo) return;
    try {
      const data = await sendJsonAuth("PUT", `${API_BASE_URL}/admin/usuarios/${item.id}`, token, {
        nombre: item.nombre,
        email: item.email,
        departamento: item.departamento || null,
        activo: true,
        tipo_cuenta: item.tipo_cuenta || "permanente",
        vigente_desde: item.vigente_desde || null,
        vigente_hasta: item.vigente_hasta || null,
        supervisor_id: item.supervisor_id ? Number(item.supervisor_id) : null,
        motivo,
      });
      if (data.solicitud) toast.info("La reactivación quedó pendiente de que otra persona autorizada la apruebe", { duration: 8000 });
      else toast.success("Cuenta reactivada");
      invalidate("usuarios", "roles", "solicitudes");
    } catch (err) {
      vAccion.errorServidor(err);
    }
  };

  // Levantar un bloqueo por intentos fallidos (motivo y reautenticacion).
  const desbloquear = async (item: ApiRecord) => {
    const motivo = await prompt({ critico: true, title: `Desbloquear a ${item.nombre || item.email}`, description: `La cuenta está bloqueada hasta las ${formatearHora(item.bloqueado_hasta, "-")} por intentos fallidos. Confirma que verificaste la identidad de la persona.`, confirmLabel: "Desbloquear" });
    if (!motivo) return;
    try {
      await sendJsonAuth("POST", `${API_BASE_URL}/admin/usuarios/${item.id}/desbloquear`, token, { motivo });
      toast.success("Cuenta desbloqueada");
      invalidate("usuarios");
    } catch (err) {
      vAccion.errorServidor(err);
    }
  };

  // Contrasena temporal; la persona debe cambiarla al entrar y sus sesiones se cierran.
  const restablecer = async (item: ApiRecord) => {
    const motivo = await prompt({ critico: true, title: `Restablecer la contraseña de ${item.nombre || item.email}`, description: "Se genera una contraseña temporal que la persona deberá cambiar al entrar; sus sesiones abiertas se cierran.", confirmLabel: "Restablecer contraseña", tone: "danger" });
    if (!motivo) return;
    try {
      const data = await sendJsonAuth("POST", `${API_BASE_URL}/admin/usuarios/${item.id}/password`, token, { motivo });
      setTemporal({ email: String(item.email || ""), password: String(data.password_temporal || "") });
      invalidate("usuarios");
    } catch (err) {
      vAccion.errorServidor(err);
    }
  };

  // usuarios:G administra cuentas y roles; con alcance "propio" la lista solo trae la cuenta propia.
  const canAdmin = can("usuarios", "G");
  const propio = alcance("usuarios", "V") === "propio";

  const menuFor = (item: ApiRecord): MenuItem[] => {
    if (!canAdmin) return [];
    const yo = Number(me?.id) === Number(item.id);
    const list: MenuItem[] = [{ label: "Editar datos", icon: <PencilSimple size={16} weight="duotone" />, tone: "brand", onSelect: () => editUser(Number(item.id)) }];
    if (!yo && item.activo) list.push({ label: "Restablecer contraseña…", icon: <Key size={16} weight="duotone" />, onSelect: () => restablecer(item) });
    if (item.bloqueado_hasta) list.push({ label: "Desbloquear…", icon: <LockOpen size={16} weight="duotone" />, onSelect: () => desbloquear(item) });
    if (!yo && item.activo) list.push({ label: "Dar de baja…", icon: <Trash size={16} weight="duotone" />, tone: "danger", separatorBefore: true, onSelect: () => darDeBaja(item) });
    if (!yo && !item.activo) list.push({ label: "Reactivar…", icon: <ArrowCounterClockwise size={16} weight="duotone" />, separatorBefore: true, onSelect: () => reactivar(item) });
    return list;
  };

  const indiceAbrir = abrirPendiente ? rows.findIndex((r) => String(r.id) === abrirPendiente) : -1;
  const indice = abierta ?? (indiceAbrir >= 0 ? indiceAbrir : null);
  const cerrar = () => {
    setAbierta(null);
    setAbrirPendiente(null);
  };

  /* Accesos rapidos (lo que era Revision de accesos): solo los que tienen algo, para usuarios:V completo. */
  const n = (f: (i: ApiRecord) => boolean) => items.filter(f).length;
  const limpiar = () => {
    setEstado("");
    setTipo("");
    setVigencia("");
    setRol("");
    setConSolicitudes(false);
    setSinRoles(false);
    setSinAutorizaciones(false);
  };
  const rapidos = propio
    ? []
    : [
        { key: "vence7", total: n((i) => venceEnSemana(i, hoy)), texto: (k: number) => (k === 1 ? "1 acceso vence esta semana" : `${k} accesos vencen esta semana`), activo: vigencia === "vence7", aplicar: () => (limpiar(), setVigencia("vence7")) },
        { key: "bloqueadas", total: n((i) => !!i.bloqueado_hasta), texto: (k: number) => (k === 1 ? "1 cuenta bloqueada" : `${k} cuentas bloqueadas`), activo: estado === "bloqueados", aplicar: () => (limpiar(), setEstado("bloqueados")) },
        { key: "temporales", total: n((i) => !!i.activo && String(i.tipo_cuenta || "") === "temporal"), texto: (k: number) => (k === 1 ? "1 cuenta temporal" : `${k} cuentas temporales`), activo: tipo === "temporal" && estado === "activos", aplicar: () => (limpiar(), setTipo("temporal"), setEstado("activos")) },
        { key: "vencidas", total: n((i) => !!i.activo && i.cuenta_vigente === false), texto: (k: number) => (k === 1 ? "1 acceso vencido" : `${k} accesos vencidos`), activo: vigencia === "vencido", aplicar: () => (limpiar(), setVigencia("vencido")) },
        { key: "solicitudes", total: n((i) => !!i.solicitud_pendiente), texto: (k: number) => (k === 1 ? "1 solicitud de acceso pendiente" : `${k} solicitudes de acceso pendientes`), activo: conSolicitudes, aplicar: () => (limpiar(), setConSolicitudes(true)) },
      ].filter((r) => r.total > 0);

  const groups: FilterGroup[] = [
    { key: "estado", label: "Estado", value: estado, defaultValue: "", onChange: (v) => setEstado(v as EstadoFiltro), options: [{ value: "", label: "Todos" }, { value: "activos", label: "Activos" }, { value: "baja", label: "De baja" }, { value: "bloqueados", label: "Bloqueados" }] },
    { key: "tipo", label: "Tipo de cuenta", value: tipo, defaultValue: "", onChange: (v) => setTipo(v as TipoFiltro), options: [{ value: "", label: "Todas" }, { value: "permanente", label: "Permanente" }, { value: "temporal", label: "Temporal" }] },
    { key: "rol", label: "Rol", value: rol, defaultValue: "", onChange: setRol, options: [{ value: "", label: "Todos" }, ...roles.map((r) => ({ value: r, label: r }))] },
    { key: "vigencia", label: "Vigencia", value: vigencia, defaultValue: "", onChange: (v) => setVigencia(v as VigenciaFiltro), options: [{ value: "", label: "Todas" }, { value: "vence7", label: "Vence en los próximos 7 días" }, { value: "vencido", label: "Acceso vencido" }] },
  ];
  const toggles: FilterToggle[] = [
    { key: "solicitudes", label: "Con solicitudes pendientes", group: "Otros", checked: conSolicitudes, onChange: setConSolicitudes },
    { key: "sin-roles", label: "Sin roles vigentes", group: "Otros", checked: sinRoles, onChange: setSinRoles },
    { key: "sin-aut", label: "Sin autorizaciones FX-THF-AP", group: "Otros", checked: sinAutorizaciones, onChange: setSinAutorizaciones },
  ];
  const filtrando = !!search.trim() || !!estado || !!tipo || !!vigencia || !!rol || conSolicitudes || sinRoles || sinAutorizaciones;

  return (
    <>
      <ValidacionAmbito v={vAccion}>{null}</ValidacionAmbito>

      {rapidos.length ? (
        <div className="mb-3 flex flex-wrap gap-1.5" aria-label="Accesos rápidos">
          {rapidos.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => (r.activo ? limpiar() : r.aplicar())}
              aria-pressed={r.activo}
              className={cn("press inline-flex h-8 items-center rounded-full px-3 text-[13px] font-medium", r.activo ? "bg-brand text-white" : "bg-surface text-ink-2 shadow-card hover:text-ink")}
            >
              {r.texto(r.total)}
            </button>
          ))}
        </div>
      ) : null}

      <Toolbar
        end={
          <div className="flex items-center gap-2">
            <SegmentedTabs size="sm" label="Ordenar" value={orden} onChange={setOrden} options={[{ value: "nombre", label: "A–Z" }, { value: "acceso", label: "Último acceso" }, { value: "alta", label: "Fecha de alta" }]} />
            {canAdmin && !propio ? (
              <Button icon={<Plus size={16} weight="bold" />} onClick={() => modal.open(null)}>
                Nuevo usuario
              </Button>
            ) : null}
          </div>
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre o correo" className="w-full md:w-[340px]" />
        {!propio ? <FilterMenu groups={groups} toggles={toggles} /> : null}
      </Toolbar>

      <div className="overflow-hidden rounded-card bg-surface shadow-card" aria-label="Usuarios">
        {resource.error ? (
          <ErrorState message={resource.error} onRetry={resource.reload} />
        ) : !resource.data ? (
          <div className="flex flex-col divide-y divide-line" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-3.5 w-1/3" />
              </div>
            ))}
          </div>
        ) : !rows.length ? (
          <EmptyState icon={<Users size={20} />} title="Sin usuarios" description={filtrando ? "No hay personas con estos filtros." : "Crea la primera cuenta de acceso."} />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((item, i) => (
              <FilaUsuario key={String(item.id)} item={item} yo={Number(me?.id) === Number(item.id)} activa={indice !== null && rows[indice] === item} onAbrir={() => setAbierta(i)} menu={menuFor(item)} />
            ))}
          </ul>
        )}
      </div>
      {resource.data && rows.length ? <p className="tnum mt-2 px-1 text-[12px] text-ink-4">{rows.length === 1 ? "1 persona" : `${fmt(rows.length)} personas`}</p> : null}

      <UsuarioVentana usuarios={rows} indice={indice} onIndice={setAbierta} onCerrar={cerrar} onDesbloquear={desbloquear} />

      <Dialog
        open={!!temporal}
        onOpenChange={(open) => !open && setTemporal(null)}
        title="Contraseña temporal"
        description={`Entrégala a ${temporal?.email || "la persona"} por un medio seguro. No se volverá a mostrar: al cerrar este aviso ya no podrás verla.`}
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              icon={<Copy size={16} />}
              onClick={() => {
                void navigator.clipboard
                  ?.writeText(temporal?.password || "")
                  .then(() => toast.success("Contraseña copiada"))
                  .catch(() => toast.error("No se pudo copiar"));
              }}
            >
              Copiar
            </Button>
            <Button onClick={() => setTemporal(null)}>Entendido</Button>
          </>
        }
      >
        <p className="rounded-[10px] bg-surface-2 px-3 py-3 text-center font-mono text-[17px] tracking-wide text-ink ring-1 ring-line" data-testid="password-temporal">
          {temporal?.password}
        </p>
        <p className="mt-3 text-[12.5px] text-ink-3">La persona deberá cambiarla al iniciar sesión. El cambio queda en la bitácora sin la contraseña.</p>
      </Dialog>

      {modal.key ? <UserSheet key={`modal-${modal.key}`} open={modal.isOpen} item={modal.payload} onClose={modal.close} /> : null}
    </>
  );
}

/* Un renglon: iniciales, nombre y correo; roles (maximo 2 y "+N"); estado; ultimo acceso; solicitud pendiente. */
function FilaUsuario({ item, yo, activa, onAbrir, menu }: { item: ApiRecord; yo: boolean; activa: boolean; onAbrir: () => void; menu: MenuItem[] }) {
  const roles = ((item.roles || []) as ApiRecord[]).map((r) => String(r.nombre || "")).filter(Boolean);
  const estado = estadoCuenta(item);
  const temporal = String(item.tipo_cuenta || "") === "temporal";
  return (
    <li className={cn("flex items-center gap-2 pr-2 transition-colors duration-150 hover:bg-surface-2", activa && "bg-brand-faint hover:bg-brand-faint")} data-usuario={String(item.id)}>
      <button type="button" onClick={onAbrir} aria-haspopup="dialog" className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left outline-none focus-visible:shadow-[inset_0_0_0_2px_rgba(15,122,149,0.45)]">
        <Iniciales nombre={item.nombre || item.email} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[14px] font-medium text-ink">
            {String(item.nombre || "Sin nombre")}
            {yo ? <span className="ml-1.5 text-[12px] font-normal text-ink-3">(tú)</span> : null}
          </span>
          <span className="truncate text-[12.5px] text-ink-3">{String(item.email || "")}</span>
        </span>
        <span className="hidden min-w-0 flex-wrap items-center gap-1 md:flex md:w-[260px]">
          {roles.slice(0, 2).map((r) => (
            <Badge key={r} tone="neutral" className="max-w-[180px] truncate">
              {r}
            </Badge>
          ))}
          {roles.length > 2 ? <span className="text-[12px] text-ink-3">+{roles.length - 2}</span> : null}
          {!roles.length ? <span className="text-[12px] text-ink-4">Sin roles</span> : null}
        </span>
        <span className="flex w-[150px] shrink-0 flex-col items-start gap-0.5">
          <Badge tone={estado.tone} dot>
            {estado.label}
          </Badge>
          {temporal && item.vigente_hasta ? <span className="text-[11.5px] text-ink-3">hasta el {formatearFecha(item.vigente_hasta)}</span> : null}
        </span>
        <span className="hidden w-[110px] shrink-0 text-[12.5px] text-ink-3 lg:block">{ultimoAcceso(item)}</span>
      </button>
      <span className="flex w-7 shrink-0 justify-center">
        <SolicitudBadge solicitud={item.solicitud_pendiente as ApiRecord | null} entidad="usuarios" />
      </span>
      <span className="w-9 shrink-0">{menu.length ? <ActionMenu items={menu} header={String(item.nombre || item.email || "")} /> : null}</span>
    </li>
  );
}
