import { apiRoute } from "@/lib/server/http";
import { createExtractionSample, listExtractionSamples } from "@/lib/server/modules/samples/extraccion";

export const GET = apiRoute(listExtractionSamples);
export const POST = apiRoute(createExtractionSample);
