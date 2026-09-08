import { apiRoute } from "@/lib/server/http";
import { recentEvents } from "@/lib/server/modules/traceability";

export const GET = apiRoute(recentEvents);
