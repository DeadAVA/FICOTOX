import { apiRoute } from "@/lib/server/http";
import { listPendingSamples } from "@/lib/server/modules/samples";

export const GET = apiRoute(listPendingSamples);
