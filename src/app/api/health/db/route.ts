import { apiRoute } from "@/lib/server/http";
import { healthDbCheck } from "@/lib/server/health";

export const GET = apiRoute(healthDbCheck);
