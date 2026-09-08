import { apiRoute } from "@/lib/server/http";
import { samplesSummary } from "@/lib/server/modules/samples";

export const GET = apiRoute(samplesSummary);
