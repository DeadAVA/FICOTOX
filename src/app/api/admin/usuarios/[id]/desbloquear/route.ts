import { apiRoute } from "@/lib/server/http";
import { desbloquearUsuario } from "@/lib/server/modules/admin";

export const POST = apiRoute(desbloquearUsuario);
