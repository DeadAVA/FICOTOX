import { apiRoute } from "@/lib/server/http";
import { refillReactivo } from "@/lib/server/modules/inventory";

export const POST = apiRoute(refillReactivo);
