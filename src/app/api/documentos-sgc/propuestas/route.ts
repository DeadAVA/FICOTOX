import { apiRoute } from "@/lib/server/http";
import { listarPropuestas, proponerDocumento } from "@/lib/server/modules/documentos-flujo";

export const GET = apiRoute(listarPropuestas);
export const POST = apiRoute(proponerDocumento);
