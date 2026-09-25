import { apiRoute } from "@/lib/server/http";
import { listarNotificaciones } from "@/lib/server/modules/notificaciones";

export const GET = apiRoute(listarNotificaciones);
