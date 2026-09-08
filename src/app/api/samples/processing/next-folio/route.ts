import { apiRoute } from "@/lib/server/http";
import { getNextFolio } from "@/lib/server/modules/samples/procesamiento";

export const GET = apiRoute(getNextFolio);
