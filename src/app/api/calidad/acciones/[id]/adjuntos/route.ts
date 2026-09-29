import { apiRoute } from "@/lib/server/http";
import { listarAdjuntosAccion, subirAdjuntoAccion } from "@/lib/server/modules/calidad/adjuntos";

export const GET = apiRoute(listarAdjuntosAccion);
export const POST = apiRoute(subirAdjuntoAccion);
