import { apiRoute } from "@/lib/server/http";
import { rechazarPropuesta } from "@/lib/server/modules/documentos-flujo";

export const POST = apiRoute(rechazarPropuesta);
