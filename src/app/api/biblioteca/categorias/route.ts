import { apiRoute } from "@/lib/server/http";
import { crearCategoria, listarCategorias } from "@/lib/server/modules/biblioteca";

export const GET = apiRoute(listarCategorias);
export const POST = apiRoute(crearCategoria);
