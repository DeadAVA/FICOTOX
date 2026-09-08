import { apiRoute } from "@/lib/server/http";
import { deleteReactivo, getReactivo, updateReactivo } from "@/lib/server/modules/inventory";

export const GET = apiRoute(getReactivo);
export const PUT = apiRoute(updateReactivo);
export const DELETE = apiRoute(deleteReactivo);
