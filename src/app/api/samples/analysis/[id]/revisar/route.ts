import { apiRoute } from "@/lib/server/http";
import { reviewAnalysis } from "@/lib/server/modules/samples/analisis";

export const POST = apiRoute(reviewAnalysis);
