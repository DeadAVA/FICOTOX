import { apiRoute } from "@/lib/server/http";
import { aprobarSolicitud } from "@/lib/server/solicitudes-ejecutar";

export const POST = apiRoute(aprobarSolicitud);
