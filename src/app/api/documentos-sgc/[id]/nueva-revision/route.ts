import { apiRoute } from "@/lib/server/http";
import { nuevaRevision } from "@/lib/server/modules/documentos-sgc";

export const POST = apiRoute(nuevaRevision);
