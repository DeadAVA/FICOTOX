import { apiRoute } from "@/lib/server/http";
import { informesSummary } from "@/lib/server/modules/informes";

export const GET = apiRoute(informesSummary);
