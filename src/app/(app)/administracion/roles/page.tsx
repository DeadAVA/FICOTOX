"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, LockKey, PencilSimple, Plus, Power, ShieldCheck, TextAa } from "@phosphor-icons/react";
import { cargarRol, DatosRolDialog, guardarRol, RolVentana } from "@/components/features/admin/RolVentana";
import { PageBody } from "@/components/shell/AppShell";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { FilterMenu, type FilterGroup } from "@/components/ui/FilterMenu";
import { ActionMenu, usePrompt, type MenuItem } from "@/components/ui/Overlay";
import { PageHeader, SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { Badge, EmptyState, ErrorState, Skeleton } from "@/components/ui/Primitives";
import { cn } from "@/components/ui/cn";
import { useValidacion, ValidacionAmbito } from "@/components/ui/Validacion";
import { API_BASE_URL, getJsonAuth } from "@/lib/client/api";
import { fmt, normalizeText } from "@/lib/client/format";
import { invalidate, useResource } from "@/lib/client/store";
import type { ApiRecord } from "@/lib/client/types";

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
              <div key={i} className="px-4 py-3.5">
                <Skeleton className="h-3.5 w-1/3" />
              </div>
            ))}
          </div>
        ) : !rows.length ? (
          <EmptyState icon={<ShieldCheck size={20} />} title="Sin roles" description={filtrando ? "No hay roles con estos filtros." : "Crea un rol para definir qué puede hacer cada persona."} />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((role, i) => {
              const personas = Number(role.total_usuarios || 0);
              return (
                <li key={String(role.id)} className={cn("flex items-center gap-2 pr-2 transition-colors duration-150 hover:bg-surface-2", abierto === i && "bg-brand-faint hover:bg-brand-faint")} data-rol={String(role.id)}>
                  <button type="button" onClick={() => abrir(role)} aria-haspopup="dialog" className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left outline-none focus-visible:shadow-[inset_0_0_0_2px_rgba(15,122,149,0.45)]">
                    <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">{String(role.nombre || "Rol")}</span>
                    {role.es_sistemico ? <Badge tone="neutral">Del sistema</Badge> : null}
                    {!role.activo ? <Badge tone="warning">Inactivo</Badge> : null}
                    <span className="w-[110px] shrink-0 text-right text-[13px] text-ink-3">{personas === 1 ? "1 persona" : `${fmt(personas)} personas`}</span>
                  </button>
                  <span className="w-9 shrink-0">
                    <ActionMenu items={menuFor(role)} header={String(role.nombre || "")} />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <RolVentana roles={rows} indice={abierto} editar={editar} onIndice={setAbierto} onEditar={setEditar} onCerrar={() => (setAbierto(null), setEditar(false))} />
      {datos ? <DatosRolDialog role={datos.role} onCerrar={() => setDatos(null)} /> : null}
    </>
  );
}
