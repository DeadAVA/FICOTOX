import { apiRoute } from "@/lib/server/http";
import { obsoletarDocumento } from "@/lib/server/modules/documentos-sgc";

export const POST = apiRoute(obsoletarDocumento);
