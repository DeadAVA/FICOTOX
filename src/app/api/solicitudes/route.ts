import { apiRoute } from "@/lib/server/http";
import { listarSolicitudes } from "@/lib/server/solicitudes";
import { solicitarExcepcion } from "@/lib/server/solicitudes-ejecutar";

export const GET = apiRoute(listarSolicitudes);
export const POST = apiRoute(solicitarExcepcion);
