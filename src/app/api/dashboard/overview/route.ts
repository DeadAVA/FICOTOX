import { apiRoute } from "@/lib/server/http";
import { dashboardOverview } from "@/lib/server/modules/dashboard";

export const GET = apiRoute(dashboardOverview);
