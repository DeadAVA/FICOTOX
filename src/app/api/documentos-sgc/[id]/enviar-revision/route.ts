import { apiRoute } from "@/lib/server/http";
import { enviarRevision } from "@/lib/server/modules/documentos-sgc";

export const POST = apiRoute(enviarRevision);
