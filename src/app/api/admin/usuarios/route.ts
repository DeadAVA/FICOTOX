import { apiRoute } from "@/lib/server/http";
import { createUsuario, listUsuarios } from "@/lib/server/modules/admin";

export const GET = apiRoute(listUsuarios);
export const POST = apiRoute(createUsuario);
