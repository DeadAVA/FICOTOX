import { apiRoute } from "@/lib/server/http";
import { createEquipo, listEquipos } from "@/lib/server/modules/inventory";

export const GET = apiRoute(listEquipos);
export const POST = apiRoute(createEquipo);
