import { apiRoute } from "@/lib/server/http";
import { indicadores } from "@/lib/server/modules/calidad/tablero";

export const GET = apiRoute(indicadores);
