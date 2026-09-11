import { apiRoute } from "@/lib/server/http";
import { restaurarExtractionSample } from "@/lib/server/modules/samples/extraccion";

export const POST = apiRoute(restaurarExtractionSample);
