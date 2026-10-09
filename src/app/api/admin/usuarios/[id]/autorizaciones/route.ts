import { apiRoute } from "@/lib/server/http";
import { listarAutorizacionesUsuario, otorgarAutorizacion } from "@/lib/server/autorizaciones";

export const GET = apiRoute(listarAutorizacionesUsuario);
export const POST = apiRoute(otorgarAutorizacion);
