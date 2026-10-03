/* Tipos del visor de la biblioteca (respuesta de GET /api/biblioteca/:id). */
export interface VersionBiblioteca {
  id: number;
  documento_id: number;
  numero: number;
  nombre_original: string;
  mime: string;
  extension: string;
  tamano_bytes: number;
  sha256: string;
  nota_version: string | null;
  subido_por: number | null;
  subido_por_nombre: string | null;
  subido_en: string;
  con_texto: boolean;
}

export interface DocumentoBiblioteca {
  id: number;
  titulo: string;
  descripcion: string | null;
  categoria: string | null;
  clave: string | null;
  etiquetas: string[];
  fecha_documento: string | null;
  visibilidad: "todos" | "roles";
  roles: { id: number; nombre: string }[];
  version_actual_id: number | null;
  creado_por_nombre: string | null;
  creado_en: string;
  archivado_en: string | null;
  motivo_archivo: string | null;
  integridad: "ok" | "alterado" | "faltante" | null;
}

export type Integridad = "ok" | "alterado" | "faltante";
