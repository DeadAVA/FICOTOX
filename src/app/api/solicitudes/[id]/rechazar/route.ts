import { apiRoute } from "@/lib/server/http";
import { rechazarSolicitud } from "@/lib/server/solicitudes";

export const POST = apiRoute(rechazarSolicitud);
