import { apiRoute } from "@/lib/server/http";
import { crearIncidencia, listarIncidencias } from "@/lib/server/modules/calidad/incidencias";

export const GET = apiRoute(listarIncidencias);
export const POST = apiRoute(crearIncidencia);
