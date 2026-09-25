import { apiRoute } from "@/lib/server/http";
import { asignarMuestra, listarAsignaciones } from "@/lib/server/asignaciones";

export const GET = apiRoute(listarAsignaciones);
export const POST = apiRoute(asignarMuestra);
