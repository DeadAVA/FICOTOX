import { apiRoute } from "@/lib/server/http";
import { asignarRolUsuario } from "@/lib/server/modules/admin";

export const POST = apiRoute(asignarRolUsuario);
