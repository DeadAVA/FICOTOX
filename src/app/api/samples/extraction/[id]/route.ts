import { apiRoute } from "@/lib/server/http";
import { deleteExtractionSample, getExtractionSample, updateExtractionSample } from "@/lib/server/modules/samples/extraccion";

export const GET = apiRoute(getExtractionSample);
export const PUT = apiRoute(updateExtractionSample);
export const DELETE = apiRoute(deleteExtractionSample);
