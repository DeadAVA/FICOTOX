import { apiRoute } from "@/lib/server/http";
import { crearAccion } from "@/lib/server/modules/calidad/nc";

export const POST = apiRoute(crearAccion);
