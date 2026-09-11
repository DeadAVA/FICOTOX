import { apiRoute } from "@/lib/server/http";
import { cancelarDocumento } from "@/lib/server/modules/documentos-sgc";

export const POST = apiRoute(cancelarDocumento);
