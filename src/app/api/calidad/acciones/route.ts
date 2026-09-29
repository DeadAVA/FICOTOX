import { apiRoute } from "@/lib/server/http";
import { listarAcciones } from "@/lib/server/modules/calidad/nc";

export const GET = apiRoute(listarAcciones);
