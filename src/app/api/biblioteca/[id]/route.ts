import { apiRoute } from "@/lib/server/http";
import { editarDocumento, obtenerDocumento } from "@/lib/server/modules/biblioteca";

export const GET = apiRoute(obtenerDocumento);
export const PUT = apiRoute(editarDocumento);
