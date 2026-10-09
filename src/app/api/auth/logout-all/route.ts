import { apiRoute } from "@/lib/server/http";
import { cerrarSesiones } from "@/lib/server/modules/auth";

export const POST = apiRoute(cerrarSesiones);
