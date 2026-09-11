import { apiRoute } from "@/lib/server/http";
import { getNextFolio } from "@/lib/server/modules/samples/analisis";

export const GET = apiRoute(getNextFolio);
