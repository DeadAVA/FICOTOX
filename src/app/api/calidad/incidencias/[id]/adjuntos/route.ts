import { apiRoute } from "@/lib/server/http";
import { listarAdjuntosIncidencia, subirAdjuntoIncidencia } from "@/lib/server/modules/calidad/adjuntos";

export const GET = apiRoute(listarAdjuntosIncidencia);
export const POST = apiRoute(subirAdjuntoIncidencia);
