import { apiRoute } from "@/lib/server/http";
import { approveAnalysis } from "@/lib/server/modules/samples/analisis";

export const POST = apiRoute(approveAnalysis);
