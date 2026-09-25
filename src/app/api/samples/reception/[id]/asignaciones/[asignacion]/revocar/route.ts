import { apiRoute } from "@/lib/server/http";
import { revocarAsignacion } from "@/lib/server/asignaciones";

export const POST = apiRoute(revocarAsignacion);
