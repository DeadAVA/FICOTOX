import { apiRoute } from "@/lib/server/http";
import { aceptarPropuesta } from "@/lib/server/modules/documentos-flujo";

export const POST = apiRoute(aceptarPropuesta);
