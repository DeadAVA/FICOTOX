import { apiRoute } from "@/lib/server/http";
import { publicarDocumento } from "@/lib/server/modules/documentos-flujo";

export const POST = apiRoute(publicarDocumento);
