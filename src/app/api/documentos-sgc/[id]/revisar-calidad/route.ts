import { apiRoute } from "@/lib/server/http";
import { revisarCalidad } from "@/lib/server/modules/documentos-flujo";

export const POST = apiRoute(revisarCalidad);
