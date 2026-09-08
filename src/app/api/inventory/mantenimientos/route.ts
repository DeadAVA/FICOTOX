import { apiRoute } from "@/lib/server/http";
import { createMantenimiento, listMantenimientos } from "@/lib/server/modules/inventory";

export const GET = apiRoute(listMantenimientos);
export const POST = apiRoute(createMantenimiento);
