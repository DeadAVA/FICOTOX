import { apiRoute } from "@/lib/server/http";
import { registrarComunicacion } from "@/lib/server/modules/calidad/nc";

export const POST = apiRoute(registrarComunicacion);
