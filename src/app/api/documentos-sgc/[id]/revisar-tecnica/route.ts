import { apiRoute } from "@/lib/server/http";
import { revisarTecnica } from "@/lib/server/modules/documentos-flujo";

export const POST = apiRoute(revisarTecnica);
