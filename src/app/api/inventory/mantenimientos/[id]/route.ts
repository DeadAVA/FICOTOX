import { apiRoute } from "@/lib/server/http";
import { deleteMantenimiento, getMantenimiento, updateMantenimiento } from "@/lib/server/modules/inventory";

export const GET = apiRoute(getMantenimiento);
export const PUT = apiRoute(updateMantenimiento);
export const DELETE = apiRoute(deleteMantenimiento);
