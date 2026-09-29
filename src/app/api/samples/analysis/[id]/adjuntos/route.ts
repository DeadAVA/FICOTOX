import { apiRoute } from "@/lib/server/http";
import { listarAdjuntosAnalisis, subirAdjuntoAnalisis } from "@/lib/server/modules/samples/analisis-adjuntos";

export const GET = apiRoute(listarAdjuntosAnalisis);
export const POST = apiRoute(subirAdjuntoAnalisis);
