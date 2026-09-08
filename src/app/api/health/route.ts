import { apiRoute } from "@/lib/server/http";
import { healthCheck } from "@/lib/server/health";

export const GET = apiRoute(healthCheck);
