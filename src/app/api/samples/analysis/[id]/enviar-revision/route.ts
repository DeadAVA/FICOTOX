import { apiRoute } from "@/lib/server/http";
import { enviarRevisionAnalysis } from "@/lib/server/modules/samples/analisis";

export const POST = apiRoute(enviarRevisionAnalysis);
