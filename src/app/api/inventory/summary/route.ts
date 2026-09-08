import { apiRoute } from "@/lib/server/http";
import { inventorySummary } from "@/lib/server/modules/inventory";

export const GET = apiRoute(inventorySummary);
