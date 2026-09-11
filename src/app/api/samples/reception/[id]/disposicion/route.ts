import { apiRoute } from "@/lib/server/http";
import { registrarDisposicion } from "@/lib/server/modules/samples/recepcion";

export const POST = apiRoute(registrarDisposicion);
