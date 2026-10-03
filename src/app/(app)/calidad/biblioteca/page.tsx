"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Archive, ArrowCounterClockwise, ArrowSquareOut, Books, DownloadSimple, GearSix, ListBullets, PencilSimple, SquaresFour, UploadSimple } from "@phosphor-icons/react";
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
import { FilterChips, FilterMenu, type FilterGroup, type FilterToggle } from "@/components/ui/FilterMenu";
import { ActionMenu, usePrompt, type MenuItem } from "@/components/ui/Overlay";
import { PageHeader, SearchInput, SegmentedTabs, Toolbar } from "@/components/ui/PageHeader";
import { Badge, EmptyState, ErrorState, Skeleton, TableSkeleton } from "@/components/ui/Primitives";
import { CellPrimary, Table, TBody, Td, Th, THead, Tr, TableShell } from "@/components/ui/Table";
import { API_BASE_URL, getJsonAuth, sendJsonAuth } from "@/lib/client/api";
import { useDebouncedValue } from "@/lib/client/hooks";
import { invalidate, useResource } from "@/lib/client/store";
import { fmtBytes } from "@/lib/shared/adjuntos";
import { BIBLIOTECA_MAX_MB_DEFAULT, MOTIVO_MIN_BIBLIOTECA, TIPOS_ARCHIVO } from "@/lib/shared/biblioteca";
import { formatearFecha } from "@/lib/shared/fechas";

/*
 * Calidad › Biblioteca: documentos de consulta (manual de calidad,
 * procedimientos, instructivos, formatos, normas, articulos...). Se suben,
 * organizan por categoria y etiquetas, se buscan (tambien dentro del texto de
 * los PDF) y se leen en el visor. Nada se borra: se archiva con motivo.
 */

type Vista = "cuadricula" | "lista";
type Orden = "recientes" | "az" | "categoria";
const CLAVE_VISTA = "ficotox.biblioteca.vista";

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
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tipo, setTipo] = useState("");
  const [archivados, setArchivados] = useState(false);
  const [orden, setOrden] = useState<Orden>("recientes");
  const [vista, setVistaState] = useState<Vista>(() => (typeof window === "undefined" ? "cuadricula" : leerVista()));
  const [subir, setSubir] = useState(false);
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
    const lista: MenuItem[] = [{ label: "Abrir", description: "Leer en el visor", icon: <ArrowSquareOut size={16} weight="duotone" />, tone: "brand", onSelect: () => abrir(doc) }];
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
            <SegmentedTabs<Orden>
              size="sm"
              label="Orden"
              value={orden}
              onChange={setOrden}
              options={[
                { value: "recientes", label: "Recientes" },
                { value: "az", label: "A–Z" },
                { value: "categoria", label: "Por categoría" },
              ]}
            />
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
        <FilterMenu groups={groups} toggles={toggles} />
        <FilterChips groups={groups} toggles={toggles} />
      </Toolbar>

      {recurso.error ? (
        <ErrorState message={recurso.error} onRetry={recurso.reload} />
      ) : !data ? (
        vista === "lista" ? (
          <TableShell>
            <TableSkeleton cols={6} />
          </TableShell>
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
          {items.map((doc) => (
            <li key={doc.id}>
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
                <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                  <div className="rounded-full bg-surface/90 shadow-card">
                    <ActionMenu items={menuDe(doc)} header={doc.titulo} />
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-3.5">
                  <div className="flex items-start gap-2">
                    <h3 className="line-clamp-2 min-w-0 flex-1 text-[14px] font-semibold leading-snug text-ink">{doc.titulo}</h3>
                    {doc.archivado_en ? <Badge tone="neutral">Archivado</Badge> : null}
                  </div>
                  <p className="truncate text-[12.5px] text-ink-3">
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
        <TableShell footer={`${items.length} ${items.length === 1 ? "documento" : "documentos"}`}>
          <Table>
            <THead>
              <tr>
                <Th>Documento</Th>
                <Th>Categoría</Th>
                <Th>Tipo</Th>
                <Th>Tamaño</Th>
                <Th>Fecha</Th>
                <Th>Versión</Th>
                <Th align="right" sticky />
              </tr>
            </THead>
            <TBody>
              {items.map((doc) => (
                <Tr key={doc.id} interactive data-testid="biblioteca-fila" data-id={doc.id} onClick={() => abrir(doc)} className={doc.archivado_en ? "opacity-60" : undefined}>
                  <Td className="max-w-[420px]">
                    <div className="flex items-center gap-3">
                      <IconoTipo extension={doc.extension} size={18} className="h-9 w-9 shrink-0" />
                      <CellPrimary title={<span className="flex items-center gap-2">{doc.titulo}{doc.archivado_en ? <Badge tone="neutral">Archivado</Badge> : null}</span>} subtitle={doc.clave || doc.etiquetas.join(", ") || undefined} />
                    </div>
                  </Td>
                  <Td muted>{doc.categoria || "—"}</Td>
                  <Td muted>{etiquetaTipo(doc.extension)}</Td>
                  <Td muted className="tnum whitespace-nowrap">
                    {doc.tamano_bytes ? fmtBytes(Number(doc.tamano_bytes)) : "—"}
                  </Td>
                  <Td muted className="whitespace-nowrap">
                    {formatearFecha(doc.fecha_documento || doc.subido_en)}
                  </Td>
                  <Td muted className="tnum">
                    v{doc.version || 1}
                  </Td>
                  <Td align="right" sticky onClick={(e) => e.stopPropagation()}>
                    <ActionMenu items={menuDe(doc)} header={doc.titulo} />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </TableShell>
      )}

      <SubirSheet open={subir} onClose={() => setSubir(false)} categorias={categorias} roles={roles} maxMb={maxMb} categoriaInicial={categoria} />
      <VersionSheet doc={version ? { id: version.id, titulo: version.titulo, version: version.version } : null} onClose={() => setVersion(null)} maxMb={maxMb} />
      <EditarSheet docId={editar} onClose={cerrarEditar} categorias={categorias} roles={roles} />
      {puede.administrar ? <CategoriasSheet open={categoriasAbierta} onClose={() => setCategoriasAbierta(false)} categorias={categorias} /> : null}
    </PageBody>
  );
}
