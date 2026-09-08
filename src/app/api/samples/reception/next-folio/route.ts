import { apiRoute } from "@/lib/server/http";
import { getNextFolio } from "@/lib/server/modules/samples/recepcion";

export const GET = apiRoute(getNextFolio);
