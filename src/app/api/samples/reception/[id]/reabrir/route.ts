import { apiRoute } from "@/lib/server/http";
import { reabrirRecepcion } from "@/lib/server/modules/samples/recepcion";

export const POST = apiRoute(reabrirRecepcion);
