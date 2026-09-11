import { apiRoute } from "@/lib/server/http";
import { reactivarReactivo } from "@/lib/server/modules/inventory";

export const POST = apiRoute(reactivarReactivo);
