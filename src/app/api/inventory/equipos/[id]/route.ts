import { apiRoute } from "@/lib/server/http";
import { deleteEquipo, getEquipo, updateEquipo } from "@/lib/server/modules/inventory";

export const GET = apiRoute(getEquipo);
export const PUT = apiRoute(updateEquipo);
export const DELETE = apiRoute(deleteEquipo);
