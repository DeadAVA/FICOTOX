import { apiRoute } from "@/lib/server/http";
import { getEtiquetas, registrarImpresionEtiquetas } from "@/lib/server/modules/samples/etiquetas";

export const GET = apiRoute(getEtiquetas);
export const POST = apiRoute(registrarImpresionEtiquetas);
