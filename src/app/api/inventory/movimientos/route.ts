import { apiRoute } from "@/lib/server/http";
import { listMovimientos } from "@/lib/server/modules/inventory";

export const GET = apiRoute(listMovimientos);
