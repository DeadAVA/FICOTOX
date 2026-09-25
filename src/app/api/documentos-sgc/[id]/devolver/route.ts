import { apiRoute } from "@/lib/server/http";
import { devolverDocumento } from "@/lib/server/modules/documentos-flujo";

export const POST = apiRoute(devolverDocumento);
