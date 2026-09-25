import { apiRoute } from "@/lib/server/http";
import { enmendarAnalysis } from "@/lib/server/modules/samples/analisis";

export const POST = apiRoute(enmendarAnalysis);
