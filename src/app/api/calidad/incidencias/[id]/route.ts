import { apiRoute } from "@/lib/server/http";
import { getIncidencia } from "@/lib/server/modules/calidad/incidencias";

export const GET = apiRoute(getIncidencia);
