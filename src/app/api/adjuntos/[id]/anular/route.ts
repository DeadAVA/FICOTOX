import { apiRoute } from "@/lib/server/http";
import { anularAdjunto } from "@/lib/server/modules/samples/analisis-adjuntos";

export const POST = apiRoute(anularAdjunto);
