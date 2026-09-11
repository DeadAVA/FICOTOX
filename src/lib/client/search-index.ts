import type { SearchHit } from "./search";

/*
 * Estado del índice de búsqueda global, separado de `search.ts` para que
 * `SessionProvider` pueda reiniciarlo sin importar el hook (evita una
 * importación circular).
 */
export const searchIndexState: {
  cache: { hits: SearchHit[]; at: number; token: string } | null;
  inflight: { token: string; promise: Promise<SearchHit[]> } | null;
} = { cache: null, inflight: null };

/* Descarta el índice (al cerrar sesión o cuando cambian datos). */
export function resetSearchIndex(): void {
  searchIndexState.cache = null;
  searchIndexState.inflight = null;
}
