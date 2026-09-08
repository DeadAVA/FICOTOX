import { apiRoute } from "@/lib/server/http";
import { createProcessingSample, listProcessingSamples } from "@/lib/server/modules/samples/procesamiento";

export const GET = apiRoute(listProcessingSamples);
export const POST = apiRoute(createProcessingSample);
