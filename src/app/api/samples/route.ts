import { apiRoute } from "@/lib/server/http";
import { listSamples } from "@/lib/server/modules/samples";

export const GET = apiRoute(listSamples);
