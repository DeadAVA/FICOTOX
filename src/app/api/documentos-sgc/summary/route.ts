import { apiRoute } from "@/lib/server/http";
import { documentosSummary } from "@/lib/server/modules/documentos-sgc";

export const GET = apiRoute(documentosSummary);
