import { apiRoute } from "@/lib/server/http";
import { anularIncidencia } from "@/lib/server/modules/calidad/incidencias";

export const POST = apiRoute(anularIncidencia);
