import { apiRoute } from "@/lib/server/http";
import { cambiarFolioRecepcion } from "@/lib/server/modules/samples/recepcion";

export const POST = apiRoute(cambiarFolioRecepcion);
