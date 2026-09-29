import { apiRoute } from "@/lib/server/http";
import { evaluarIncidenciaApi } from "@/lib/server/modules/calidad/incidencias";

export const POST = apiRoute(evaluarIncidenciaApi);
