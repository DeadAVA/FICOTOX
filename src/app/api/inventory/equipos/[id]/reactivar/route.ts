import { apiRoute } from "@/lib/server/http";
import { reactivarEquipo } from "@/lib/server/modules/inventory";

export const POST = apiRoute(reactivarEquipo);
