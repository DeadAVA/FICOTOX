import { apiRoute } from "@/lib/server/http";
import { getNextFolio } from "@/lib/server/modules/samples/extraccion";

export const GET = apiRoute(getNextFolio);
