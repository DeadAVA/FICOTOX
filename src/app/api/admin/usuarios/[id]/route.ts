import { apiRoute } from "@/lib/server/http";
import { deleteUsuario, getUsuario, updateUsuario } from "@/lib/server/modules/admin";

export const GET = apiRoute(getUsuario);
export const PUT = apiRoute(updateUsuario);
export const DELETE = apiRoute(deleteUsuario);
