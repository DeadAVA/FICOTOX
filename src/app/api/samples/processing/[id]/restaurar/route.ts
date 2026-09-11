import { apiRoute } from "@/lib/server/http";
import { restaurarProcessingSample } from "@/lib/server/modules/samples/procesamiento";

export const POST = apiRoute(restaurarProcessingSample);
