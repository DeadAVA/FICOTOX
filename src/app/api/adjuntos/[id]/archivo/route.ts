import { apiRoute } from "@/lib/server/http";
import { descargarAdjunto } from "@/lib/server/modules/samples/analisis-adjuntos";

export const GET = apiRoute(descargarAdjunto);
