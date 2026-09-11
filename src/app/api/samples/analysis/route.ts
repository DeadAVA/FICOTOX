import { apiRoute } from "@/lib/server/http";
import { createAnalysis, listAnalyses } from "@/lib/server/modules/samples/analisis";

export const GET = apiRoute(listAnalyses);
export const POST = apiRoute(createAnalysis);
