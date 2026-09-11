import { apiRoute } from "@/lib/server/http";
import { aprobarDocumento } from "@/lib/server/modules/documentos-sgc";

export const POST = apiRoute(aprobarDocumento);
