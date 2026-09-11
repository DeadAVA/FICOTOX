import { apiRoute } from "@/lib/server/http";
import { createDocumento, listDocumentos } from "@/lib/server/modules/documentos-sgc";

export const GET = apiRoute(listDocumentos);
export const POST = apiRoute(createDocumento);
