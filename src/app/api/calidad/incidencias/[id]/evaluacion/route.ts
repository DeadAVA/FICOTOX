import { apiRoute } from "@/lib/server/http";
import { iniciarEvaluacion } from "@/lib/server/modules/calidad/incidencias";

export const POST = apiRoute(iniciarEvaluacion);
