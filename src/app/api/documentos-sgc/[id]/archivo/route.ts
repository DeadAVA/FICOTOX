import { apiRoute } from "@/lib/server/http";
import { getDocumentoArchivo } from "@/lib/server/modules/documentos-sgc";

export const GET = apiRoute(getDocumentoArchivo);
