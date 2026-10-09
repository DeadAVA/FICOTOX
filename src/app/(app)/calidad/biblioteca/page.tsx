"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Archive, ArrowCounterClockwise, Books, DownloadSimple, GearSix, ListBullets, PencilSimple, SquaresFour, UploadSimple } from "@phosphor-icons/react";
import { CategoriasSheet } from "@/components/features/biblioteca/CategoriasSheet";
import { cargarRoles, descargarVersion, IconoTipo, MiniaturaDocumento, etiquetaTipo, type Categoria, type DocBiblioteca, type RolOpcion } from "@/components/features/biblioteca/comun";
import { EditarSheet } from "@/components/features/biblioteca/EditarSheet";
import { SubirSheet } from "@/components/features/biblioteca/SubirSheet";
import { VersionSheet } from "@/components/features/biblioteca/VersionSheet";
import { PageBody } from "@/components/shell/AppShell";
import { RequireModule } from "@/components/session/RequireModule";
import { useSession } from "@/components/session/SessionProvider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { FilterMenu, type FilterGroup, type FilterToggle } from "@/components/ui/FilterMenu";
import { SinDato } from "@/components/ui/Insignias";
import { ListaCuadricula, type ColumnaLista } from "@/components/ui/ListaCuadricula";
import { ActionMenu, usePrompt, type MenuItem } from "@/components/ui/Overlay";
import { PageHeader, SearchInput, Toolbar } from "@/components/ui/PageHeader";
import { Badge, EmptyState, ErrorState, Skeleton } from "@/components/ui/Primitives";
import { API_BASE_URL, getJsonAuth, sendJsonAuth } from "@/lib/client/api";
import { useDebouncedValue, useInitialParam, useParamChange } from "@/lib/client/hooks";
import { invalidate, useResource } from "@/lib/client/store";
import { fmtBytes } from "@/lib/shared/adjuntos";
import { BIBLIOTECA_MAX_MB_DEFAULT, MOTIVO_MIN_BIBLIOTECA, TIPOS_ARCHIVO } from "@/lib/shared/biblioteca";
import { formatearFecha, formatearFechaCorta } from "@/lib/shared/fechas";

/*
 * Calidad › Biblioteca: documentos de consulta (manual de calidad,
 * procedimientos, instructivos, formatos, normas, articulos...). Se suben,
 * organizan por categoria y etiquetas, se buscan (tambien dentro del texto de
 * los PDF) y se leen en el visor. Nada se borra: se archiva con motivo.
 */

type Vista = "cuadricula" | "lista";
type Orden = "recientes" | "az" | "categoria";
const CLAVE_VISTA = "ficotox.biblioteca.vista";

/* Columnas fijas de la vista de lista (ListaCuadricula); en angostas, tarjeta. */
const COLUMNAS: ColumnaLista[] = [
  { clave: "documento", titulo: "Documento", ancho: "minmax(260px,2.2fr)" },
  { clave: "categoria", titulo: "Categoría", ancho: "minmax(140px,1fr)" },
  { clave: "tipo", titulo: "Tipo", ancho: "90px" },
  { clave: "tamano", titulo: "Tamaño", ancho: "100px", ocultaEnTarjeta: true },
  { clave: "fecha", titulo: "Fecha", ancho: "120px" },
  { clave: "version", titulo: "Versión", ancho: "80px" },
];

interface Respuesta {
  items: DocBiblioteca[];
  categorias: Categoria[];
  puede: { subir: boolean; administrar: boolean; archivar: boolean };
  max_mb: number;
}

export default function BibliotecaPage() {
  return (
    <RequireModule modules="documentos">
      <Biblioteca />
    </RequireModule>
  );
}

const leerVista = (): Vista => {
  try {
    return window.localStorage.getItem(CLAVE_VISTA) === "lista" ? "lista" : "cuadricula";
  } catch {
    return "cuadricula";
  }
};

function Biblioteca() {
  const { token } = useSession();
  const router = useRouter();
  const prompt = usePrompt();
  const [search, setSearch] = useState(useInitialParam("buscar"));
  useParamChange("buscar", setSearch);
  const [categoria, setCategoria] = useState("");
  const [tipo, setTipo] = useState("");
  const [archivados, setArchivados] = useState(false);
  const [orden, setOrden] = useState<Orden>("recientes");
  const [vista, setVistaState] = useState<Vista>(() => (typeof window === "undefined" ? "cuadricula" : leerVista()));
  const [subir, setSubir] = useState(false);
  // Desde el Inicio (acceso rapido "Subir documento"): ?subir=1 abre el formulario en cuanto se sabe si la persona puede subir.
  const [pedidoSubir, setPedidoSubir] = useState(useInitialParam("subir") === "1");
  const [version, setVersion] = useState<DocBiblioteca | null>(null);
  const [editar, setEditar] = useState<number | null>(null);
  const [categoriasAbierta, setCategoriasAbierta] = useState(false);
  const [roles, setRoles] = useState<RolOpcion[] | null>(null);
  const debounced = useDebouncedValue(search);

  const setVista = (v: Vista) => {
    setVistaState(v);
    try {
      window.localStorage.setItem(CLAVE_VISTA, v);
    } catch {
      /* sin almacenamiento */
    }
  };

  const recurso = useResource<Respuesta>(
    "biblioteca",
    async () => {
      const q = new URLSearchParams({ search: debounced.trim(), orden });
      if (categoria) q.set("categoria", categoria);
      if (tipo) q.set("tipo", tipo);
      if (archivados) q.set("archivados", "1");
      return (await getJsonAuth(`${API_BASE_URL}/biblioteca?${q.toString()}`, token)) as unknown as Respuesta;
    },
    { enabled: !!token, deps: [debounced, categoria, tipo, archivados, orden] },
  );
  const data = recurso.data;
  const items = data?.items || [];
  const categorias = data?.categorias || [];
  const puede = data?.puede || { subir: false, administrar: false, archivar: false };
  const maxMb = data?.max_mb || BIBLIOTECA_MAX_MB_DEFAULT;

  useEffect(() => {
    if (!pedidoSubir || !data) return;
    void Promise.resolve().then(() => {
      if (puede.subir) setSubir(true);
      setPedidoSubir(false);
    });
  }, [pedidoSubir, data, puede.subir]);

  // Roles para la visibilidad: solo si la persona puede leer el catalogo (si no, solo "todos").
  useEffect(() => {
    if (!token || !(puede.subir || puede.administrar)) return;
    let cancelado = false;
    void cargarRoles(token).then((r) => !cancelado && setRoles(r));
    return () => {
      cancelado = true;
    };
  }, [token, puede.subir, puede.administrar]);

  const groups: FilterGroup[] = [
    { key: "categoria", label: "Categoría", value: categoria, defaultValue: "", onChange: setCategoria, options: [{ value: "", label: "Todas" }, ...categorias.filter((c) => Number(c.activa)).map((c) => ({ value: String(c.id), label: c.nombre }))] },
    { key: "tipo", label: "Tipo de archivo", value: tipo, defaultValue: "", onChange: setTipo, options: [{ value: "", label: "Todos" }, ...TIPOS_ARCHIVO.map((t) => ({ value: t.value, label: t.label }))] },
  ];
  const toggles: FilterToggle[] = [{ key: "archivados", label: "Mostrar archivados", checked: archivados, onChange: setArchivados }];
  // "Ordenar por" va al final del menu Filtros (una sola seleccion).
  const ordenar: FilterGroup[] = [
    { key: "orden", label: "Ordenar por", value: orden, defaultValue: "recientes", showDefault: true, onChange: (v) => setOrden(v as Orden), options: [{ value: "recientes", label: "Más recientes" }, { value: "az", label: "Título A–Z" }, { value: "categoria", label: "Categoría" }] },
  ];
  const filtrado = !!(debounced.trim() || categoria || tipo);

  const cerrarEditar = useCallback(() => setEditar(null), []);
  const abrir = (doc: DocBiblioteca) => router.push(`/calidad/biblioteca/${doc.id}`);

  const archivar = async (doc: DocBiblioteca, archivarlo: boolean) => {
    const motivo = await prompt({
      critico: true,
      title: archivarlo ? `Archivar «${doc.titulo}»` : `Restaurar «${doc.titulo}»`,
      description: archivarlo ? "Deja de aparecer en la biblioteca (salvo con «Mostrar archivados»). No se borra: el archivo y sus versiones se conservan." : "Vuelve a aparecer en la biblioteca.",
      label: "Motivo",
      minLength: MOTIVO_MIN_BIBLIOTECA,
      confirmLabel: archivarlo ? "Archivar" : "Restaurar",
      tone: archivarlo ? "danger" : "primary",
    });
    if (!motivo) return;
    try {
      await sendJsonAuth("POST", `${API_BASE_URL}/biblioteca/${doc.id}/${archivarlo ? "archivar" : "restaurar"}`, token, { motivo });
      toast.success(archivarlo ? "Documento archivado" : "Documento restaurado");
      invalidate("biblioteca");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo completar la acción");
    }
  };

  const menuDe = (doc: DocBiblioteca): MenuItem[] => {
    // Sin "Abrir": el clic en el documento ya abre el visor.
    const lista: MenuItem[] = [];
    if (doc.version_actual_id) lista.push({ label: "Descargar", description: "Queda en la bitácora", icon: <DownloadSimple size={16} weight="duotone" />, onSelect: () => void descargarVersion(Number(doc.version_actual_id), token, String(doc.nombre_original || doc.titulo)) });
    if (doc.puede.subir_version) lista.push({ label: "Subir nueva versión", description: "La anterior se conserva", icon: <UploadSimple size={16} weight="duotone" />, tone: "success", onSelect: () => setVersion(doc) });
    if (doc.puede.editar) lista.push({ label: "Editar datos", description: "Título, categoría, etiquetas, visibilidad", icon: <PencilSimple size={16} weight="duotone" />, onSelect: () => setEditar(doc.id) });
    if (doc.puede.archivar) {
      lista.push(
        doc.archivado_en
          ? { label: "Restaurar", description: "Vuelve a la biblioteca, con motivo", icon: <ArrowCounterClockwise size={16} weight="duotone" />, tone: "warning", separatorBefore: true, onSelect: () => void archivar(doc, false) }
          : { label: "Archivar…", description: "Con motivo; no se borra", icon: <Archive size={16} weight="duotone" />, tone: "danger", separatorBefore: true, onSelect: () => void archivar(doc, true) },
      );
    }
    return lista;
  };

  const teclaAbrir = (doc: DocBiblioteca) => (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      abrir(doc);
    }
  };

  return (
    <PageBody>
      <PageHeader
        title="Biblioteca"
        description="Manual de calidad, procedimientos, instructivos, formatos, normas y referencias: súbelos, encuéntralos y léelos dentro de la plataforma."
        actions={
          <>
            {puede.administrar ? (
              <Button variant="secondary" icon={<GearSix size={16} />} onClick={() => setCategoriasAbierta(true)}>
                Categorías
              </Button>
            ) : null}
            {puede.subir ? (
              <Button icon={<UploadSimple size={16} weight="bold" />} onClick={() => setSubir(true)} data-testid="biblioteca-subir">
                Subir documento
              </Button>
            ) : null}
          </>
        }
      />

      <Toolbar
        end={
          <div className="flex items-center gap-2">
            <div className="flex rounded-full bg-surface-3 p-0.5" role="group" aria-label="Vista">
              <button type="button" data-testid="biblioteca-vista-cuadricula" aria-pressed={vista === "cuadricula"} aria-label="Ver en cuadrícula" onClick={() => setVista("cuadricula")} className={cn("press flex h-8 w-8 items-center justify-center rounded-full", vista === "cuadricula" ? "bg-surface text-ink shadow-card" : "text-ink-3 hover:text-ink")}>
                <SquaresFour size={16} weight={vista === "cuadricula" ? "fill" : "regular"} />
              </button>
              <button type="button" data-testid="biblioteca-vista-lista" aria-pressed={vista === "lista"} aria-label="Ver en lista" onClick={() => setVista("lista")} className={cn("press flex h-8 w-8 items-center justify-center rounded-full", vista === "lista" ? "bg-surface text-ink shadow-card" : "text-ink-3 hover:text-ink")}>
                <ListBullets size={16} weight="bold" />
              </button>
            </div>
          </div>
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por título, clave, etiqueta o texto del PDF" className="w-full md:w-[360px]" />
        <FilterMenu groups={groups} toggles={toggles} gruposFinales={ordenar} />
      </Toolbar>

      {recurso.error ? (
        <ErrorState message={recurso.error} onRetry={recurso.reload} />
      ) : !data ? (
        vista === "lista" ? (
          <ListaCuadricula etiqueta="Documentos" columnas={COLUMNAS} filas={null} clave={() => ""} celdas={() => []} onAbrir={() => undefined} vacio={{ titulo: "" }} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[280px] w-full rounded-card" />
            ))}
          </div>
        )
      ) : !items.length ? (
        <div className="rounded-card bg-surface shadow-card" data-testid="biblioteca-vacia">
          <EmptyState
            icon={<Books size={22} weight="duotone" />}
            title={filtrado ? "Sin coincidencias" : archivados ? "No hay documentos" : "La biblioteca está vacía"}
            description={filtrado ? "Prueba con otra palabra o quita algún filtro." : "Sube el manual de calidad, procedimientos, instructivos, normas o artículos para tenerlos a la mano y leerlos aquí mismo."}
            action={
              !filtrado && puede.subir ? (
                <Button icon={<UploadSimple size={16} weight="bold" />} onClick={() => setSubir(true)}>
                  Subir el primer documento
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : vista === "cuadricula" ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Documentos">
          {items.map((doc, i) => (
            <li key={doc.id} className="entrada-escalonada" style={{ ["--i" as string]: i }}>
              <article
                data-testid="biblioteca-tarjeta"
                data-id={doc.id}
                tabIndex={0}
                role="link"
                aria-label={`Abrir ${doc.titulo}`}
                onClick={() => abrir(doc)}
                onKeyDown={teclaAbrir(doc)}
                className={cn("group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-card bg-surface shadow-card transition-shadow hover:shadow-raised", doc.archivado_en && "opacity-60")}
              >
                <MiniaturaDocumento doc={doc} token={token} className="aspect-[4/3] w-full border-b border-line" />
                {menuDe(doc).length ? (
                  <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                    <div className="rounded-full bg-surface/90 shadow-card">
                      <ActionMenu items={menuDe(doc)} header={doc.titulo} />
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-1 flex-col gap-1.5 p-3.5">
                  <div className="flex items-start gap-2">
                    <h3 className="min-w-0 flex-1 break-words text-[14px] font-semibold leading-snug text-ink">{doc.titulo}</h3>
                    {doc.archivado_en ? <Badge tone="neutral">Archivado</Badge> : null}
                  </div>
                  <p className="break-words text-[12.5px] text-ink-3">
                    {[doc.categoria, doc.clave].filter(Boolean).join(" · ") || "Sin categoría"}
                  </p>
                  <p className="tnum mt-auto flex flex-wrap items-center gap-x-1.5 text-[12px] text-ink-3">
                    <span className="rounded-[5px] bg-surface-3 px-1.5 py-0.5 text-[11px] font-semibold text-ink-2">{etiquetaTipo(doc.extension)}</span>
                    <span>{doc.tamano_bytes ? fmtBytes(Number(doc.tamano_bytes)) : "—"}</span>
                    <span>·</span>
                    <span>{formatearFecha(doc.fecha_documento || doc.subido_en)}</span>
                    <span>·</span>
                    <span>v{doc.version || 1}</span>
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <ListaCuadricula
          etiqueta="Documentos"
          columnas={COLUMNAS}
          filas={items}
          clave={(doc) => String(doc.id)}
          onAbrir={(doc) => abrir(doc)}
          celdas={(doc) => [
            <span key="d" className="flex min-w-0 items-start gap-3">
              <IconoTipo extension={doc.extension} size={18} className="h-10 w-10 shrink-0" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="break-words text-[14px] leading-snug font-semibold text-ink">{doc.titulo}</span>
                  {doc.archivado_en ? <Badge tone="neutral">Archivado</Badge> : null}
                </span>
                {doc.clave || doc.etiquetas.length ? <span className="break-words text-[12.5px] text-ink-3">{doc.clave || doc.etiquetas.join(", ")}</span> : null}
              </span>
            </span>,
            doc.categoria ? <span key="c" className="text-[13px] text-ink-2">{doc.categoria}</span> : <SinDato key="c" />,
            <span key="t" className="inline-flex rounded-[6px] bg-surface-3 px-1.5 py-0.5 text-[11.5px] font-semibold text-ink-2">{etiquetaTipo(doc.extension)}</span>,
            <span key="s" className="tnum text-[13px] text-ink-2">{doc.tamano_bytes ? fmtBytes(Number(doc.tamano_bytes)) : "—"}</span>,
            <span key="f" className="text-[13px] text-ink-2" title={formatearFecha(doc.fecha_documento || doc.subido_en)}>
              {formatearFechaCorta(doc.fecha_documento || doc.subido_en)}
            </span>,
            <span key="v" className="tnum text-[13px] text-ink-2">v{doc.version || 1}</span>,
          ]}
          extremo={(doc) => {
            const menu = menuDe(doc);
            return <span className="w-9">{menu.length ? <ActionMenu items={menu} header={doc.titulo} /> : null}</span>;
          }}
          anchoExtremo="52px"
          propsFila={(doc) => ({ "data-testid": "biblioteca-fila", "data-id": String(doc.id), "data-archivado": doc.archivado_en ? "1" : "0" })}
          vacio={{ titulo: "Sin documentos" }}
        />
      )}

      <SubirSheet open={subir} onClose={() => setSubir(false)} categorias={categorias} roles={roles} maxMb={maxMb} categoriaInicial={categoria} />
      <VersionSheet doc={version ? { id: version.id, titulo: version.titulo, version: version.version } : null} onClose={() => setVersion(null)} maxMb={maxMb} />
      <EditarSheet docId={editar} onClose={cerrarEditar} categorias={categorias} roles={roles} />
      {puede.administrar ? <CategoriasSheet open={categoriasAbierta} onClose={() => setCategoriasAbierta(false)} categorias={categorias} /> : null}
    </PageBody>
  );
}
