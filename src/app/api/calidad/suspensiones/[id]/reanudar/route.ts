import { apiRoute } from "@/lib/server/http";
import { reanudar } from "@/lib/server/modules/calidad/nc";

export const POST = apiRoute(reanudar);
