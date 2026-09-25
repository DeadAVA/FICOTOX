import { apiRoute } from "@/lib/server/http";
import { cancelarSolicitud } from "@/lib/server/solicitudes";

export const POST = apiRoute(cancelarSolicitud);
