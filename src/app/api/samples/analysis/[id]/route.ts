import { apiRoute } from "@/lib/server/http";
import { deleteAnalysis, getAnalysis, updateAnalysis } from "@/lib/server/modules/samples/analisis";

export const GET = apiRoute(getAnalysis);
export const PUT = apiRoute(updateAnalysis);
export const DELETE = apiRoute(deleteAnalysis);
