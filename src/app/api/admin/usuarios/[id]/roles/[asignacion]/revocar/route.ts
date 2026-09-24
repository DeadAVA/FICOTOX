import { apiRoute } from "@/lib/server/http";
import { revocarRolUsuario } from "@/lib/server/modules/admin";

export const POST = apiRoute(revocarRolUsuario);
