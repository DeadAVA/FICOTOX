"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, LockKey, PencilSimple, Plus, Power, ShieldCheck, TextAa } from "@phosphor-icons/react";
import { IconoRol } from "@/components/features/admin/iconos";
import { cargarRol, DatosRolDialog, guardarRol, RolVentana } from "@/components/features/admin/RolVentana";
import { PageBody } from "@/components/shell/AppShell";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { FilterMenu, type FilterGroup } from "@/components/ui/FilterMenu";
import { ActionMenu, usePrompt, type MenuItem } from "@/components/ui/Overlay";
import { PageHeader, SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { Avatar, Badge, EmptyState, ErrorState, Skeleton } from "@/components/ui/Primitives";
import { cn } from "@/components/ui/cn";
import { useValidacion, ValidacionAmbito } from "@/components/ui/Validacion";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { fmt, normalizeText } from "@/lib/client/format";
import { invalidate, useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";
import { descripcionDeRol } from "@/lib/shared/roles-descripcion";

/*
 * Roles (minimalista): una lista sencilla (nombre, cuantas personas lo tienen,
 * "Del sistema" e "Inactivo") y, al pulsar un rol, su ventana centrada con lo
 * que puede hacer en palabras, las personas y el editor de permisos. Las
 * reglas no cambian (motivo, reautenticacion, combinaciones prohibidas, rol
 * propio en solo lectura).
 */

export default function RolesPage() {
  return (
    <PageBody>
      <PageHeader title="Roles" description="Qué puede hacer cada rol en la plataforma. Lo que no se concede, no se puede hacer." />
      <RequireModule modules="usuarios">
        <RolesGuard />
      </RequireModule>
    </PageBody>
  );
}

/* Con alcance "propio" en usuarios la persona solo ve su cuenta: el catalogo de roles no le corresponde. */
function RolesGuard() {
  const { alcance } = useSession();
  if (alcance("usuarios", "V") === "propio") {
    return <EmptyState icon={<LockKey size={20} />} title="Sin acceso a esta sección" description="Solo puedes ver tu propia cuenta." />;
  }
  return <RolesContent />;
}

type EstadoFiltro = "" | "activos" | "inactivos";
type TipoFiltro = "" | "sistema" | "personalizados";
type UsoFiltro = "" | "con" | "sin";

function RolesContent() {
  const { token, can, roles: rolesSesion } = useSession();
  const prompt = usePrompt();
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<EstadoFiltro>("");
  const [tipo, setTipo] = useState<TipoFiltro>("");
  const [uso, setUso] = useState<UsoFiltro>("");
  const [abierto, setAbierto] = useState<number | null>(null);
  const [editar, setEditar] = useState(false);
  const [datos, setDatos] = useState<{ role: ApiRecord | null } | null>(null);

  const resource = useResource<ApiRecord[]>(
    "roles",
    async () => {
      const data = await getJsonAuth(`${API_BASE_URL}/admin/roles`, token);
      return (data.items || []) as ApiRecord[];
    },
    { enabled: !!token },
  );
  const roles = useMemo(() => resource.data || [], [resource.data]);
  const rows = useMemo(() => {
    const term = normalizeText(search);
    return roles.filter((role) => {
      if (term && !normalizeText(String(role.nombre || "")).includes(term)) return false;
      if (estado === "activos" && !role.activo) return false;
      if (estado === "inactivos" && role.activo) return false;
      if (tipo === "sistema" && !role.es_sistemico) return false;
      if (tipo === "personalizados" && role.es_sistemico) return false;
      if (uso === "con" && !Number(role.total_usuarios || 0)) return false;
      if (uso === "sin" && Number(role.total_usuarios || 0)) return false;
      return true;
    });
  }, [roles, search, estado, tipo, uso]);

  // Errores de las acciones (motivo y contraseña ya capturados): pop-up con qué pasó y qué hacer.
  const vAccion = useValidacion({ titulo: "No se pudo completar la acción", reglas: () => [] });
  const canAdmin = can("usuarios", "G");

  const abrir = (role: ApiRecord, enEdicion = false) => {
    setEditar(enEdicion);
    setAbierto(rows.indexOf(role));
  };

  // Activar o desactivar: cambia lo que concede el rol, con motivo y reautenticacion (como siempre).
  const activarDesactivar = async (role: ApiRecord) => {
    const activar = !role.activo;
    const motivo = await prompt({ critico: true, title: `${activar ? "Activar" : "Desactivar"} el rol «${role.nombre}»`, description: activar ? "Quien tenga este rol vuelve a tener sus permisos." : "Un rol inactivo no concede permisos a nadie; sus asignaciones se conservan.", label: "Motivo", minLength: 5, confirmLabel: activar ? "Activar" : "Desactivar", tone: activar ? undefined : "danger" });
    if (!motivo) return;
    try {
      const actual = await cargarRol(Number(role.id), token);
      await guardarRol(token, actual.role, { activo: activar, permisos: actual.permisos, motivo });
      toast.success(activar ? "Rol activado" : "Rol desactivado");
      invalidate("roles", "usuarios");
    } catch (err) {
      vAccion.errorServidor(err);
    }
  };

  const menuFor = (role: ApiRecord): MenuItem[] => {
    const propio = rolesSesion.some((rol) => Number(rol.id) === Number(role.id));
    if (!canAdmin || propio) return [{ label: "Ver permisos", icon: <Eye size={16} weight="duotone" />, tone: "brand", onSelect: () => abrir(role) }];
    return [
      { label: "Editar permisos", icon: <PencilSimple size={16} weight="duotone" />, tone: "brand", onSelect: () => abrir(role, true) },
      { label: "Editar nombre y descripción", icon: <TextAa size={16} weight="duotone" />, onSelect: () => setDatos({ role }) },
      { label: role.activo ? "Desactivar…" : "Activar…", icon: <Power size={16} weight="duotone" />, tone: role.activo ? "danger" : undefined, separatorBefore: true, onSelect: () => activarDesactivar(role) },
    ];
  };

  const groups: FilterGroup[] = [
    { key: "estado", label: "Estado", value: estado, defaultValue: "", onChange: (v) => setEstado(v as EstadoFiltro), options: [{ value: "", label: "Todos" }, { value: "activos", label: "Activos" }, { value: "inactivos", label: "Inactivos" }] },
    { key: "tipo", label: "Tipo", value: tipo, defaultValue: "", onChange: (v) => setTipo(v as TipoFiltro), options: [{ value: "", label: "Todos" }, { value: "sistema", label: "Del sistema" }, { value: "personalizados", label: "Personalizados" }] },
    { key: "uso", label: "Uso", value: uso, defaultValue: "", onChange: (v) => setUso(v as UsoFiltro), options: [{ value: "", label: "Todos" }, { value: "con", label: "Con personas asignadas" }, { value: "sin", label: "Sin personas" }] },
  ];
  const filtrando = !!search.trim() || !!estado || !!tipo || !!uso;

  return (
    <>
      <ValidacionAmbito v={vAccion}>{null}</ValidacionAmbito>
      <Toolbar
        end={
          canAdmin ? (
            <Button icon={<Plus size={16} weight="bold" />} onClick={() => setDatos({ role: null })}>
              Nuevo rol
            </Button>
          ) : null
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre" className="w-full md:w-[320px]" />
        <FilterMenu groups={groups} />
      </Toolbar>

      <div className="overflow-hidden rounded-card bg-surface shadow-card" aria-label="Roles">
        {resource.error ? (
          <ErrorState message={resource.error} onRetry={resource.reload} />
        ) : !resource.data ? (
          <div className="flex flex-col divide-y divide-line" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="h-10 w-10 rounded-[12px]" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3.5 w-1/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-7 w-24 rounded-full" />
              </div>
            ))}
          </div>
        ) : !rows.length ? (
          <EmptyState icon={<ShieldCheck size={20} />} title="Sin roles" description={filtrando ? "No hay roles con estos filtros." : "Crea un rol para definir qué puede hacer cada persona."} />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((role, i) => (
              <FilaRol key={String(role.id)} role={role} i={i} activa={abierto === i} onAbrir={() => abrir(role)} menu={menuFor(role)} />
            ))}
          </ul>
        )}
      </div>

      <RolVentana roles={rows} indice={abierto} editar={editar} onIndice={setAbierto} onEditar={setEditar} onCerrar={() => (setAbierto(null), setEditar(false))} />
      {datos ? <DatosRolDialog role={datos.role} onCerrar={() => setDatos(null)} /> : null}
    </>
  );
}

/*
 * Un renglon: icono del rol, nombre completo y su proposito en gris; figuras de
 * las personas que lo tienen (maximo 4 y "+N") con el total; "Del sistema" e
 * "Inactivo". En pantallas angostas, tarjeta compacta.
 */
function FilaRol({ role, i, activa, onAbrir, menu }: { role: ApiRecord; i: number; activa: boolean; onAbrir: () => void; menu: MenuItem[] }) {
  const desc = descripcionDeRol(role);
  const personas = (role.personas || []) as ApiRecord[];
  const total = Number(role.total_usuarios || personas.length || 0);
  return (
    <li className={cn("entrada-escalonada group transition-colors duration-200 hover:bg-surface-2/70", activa && "bg-brand-faint hover:bg-brand-faint")} style={{ ["--i" as string]: i }} data-rol={String(role.id)}>
      <div className="flex items-start gap-2 pr-2 md:items-center">
        <button type="button" onClick={onAbrir} aria-haspopup="dialog" className="grid min-w-0 flex-1 gap-x-5 gap-y-3 px-4 py-4 text-left outline-none focus-visible:shadow-[inset_0_0_0_2px_rgba(15,122,149,0.45)] sm:px-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <span className="flex min-w-0 items-start gap-3.5">
            <IconoRol icono={desc.icono} />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-[14.5px] font-semibold leading-tight text-ink">{String(role.nombre || "Rol")}</span>
                {role.es_sistemico ? <Badge tone="neutral">Del sistema</Badge> : null}
                {!role.activo ? <Badge tone="warning">Inactivo</Badge> : null}
              </span>
              <span className="text-[13px] leading-[1.45] text-ink-3">{desc.proposito}</span>
            </span>
          </span>
          <span className="flex items-center gap-2.5 pl-[54px] md:pl-0">
            {personas.length ? (
              <span className="flex -space-x-2" aria-hidden="true">
                {personas.slice(0, 4).map((p) => (
                  <Avatar key={String(p.id)} name={p.nombre} email={p.email} avatar={p.avatar} size="sm" className="ring-2 ring-surface transition-transform duration-200 ease-[var(--ease-spring)] group-hover:-translate-y-0.5" />
                ))}
                {personas.length > 4 ? <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-3 text-[11px] font-semibold text-ink-2 ring-2 ring-surface">+{personas.length - 4}</span> : null}
              </span>
            ) : null}
            <span className="text-[13px] text-ink-3">{total ? (total === 1 ? "1 persona" : `${fmt(total)} personas`) : "Sin personas"}</span>
          </span>
        </button>
        <span className="w-9 shrink-0 pt-4 md:pt-0">
          <ActionMenu items={menu} header={String(role.nombre || "")} />
        </span>
      </div>
    </li>
  );
}

