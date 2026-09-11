import { apiRoute } from "@/lib/server/http";
import { getNextFolio } from "@/lib/server/modules/informes";

export const GET = apiRoute(getNextFolio);
