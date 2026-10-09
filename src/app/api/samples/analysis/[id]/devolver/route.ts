import { apiRoute } from "@/lib/server/http";
import { devolverAnalysis } from "@/lib/server/modules/samples/analisis";

export const POST = apiRoute(devolverAnalysis);
