import { apiRoute } from "@/lib/server/http";
import { restaurarAnalysis } from "@/lib/server/modules/samples/analisis";

export const POST = apiRoute(restaurarAnalysis);
