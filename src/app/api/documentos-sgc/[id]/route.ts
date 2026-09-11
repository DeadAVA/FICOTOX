import { apiRoute } from "@/lib/server/http";
import { deleteDocumento, getDocumento, updateDocumento } from "@/lib/server/modules/documentos-sgc";

export const GET = apiRoute(getDocumento);
export const PUT = apiRoute(updateDocumento);
export const DELETE = apiRoute(deleteDocumento);
