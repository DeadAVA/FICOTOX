import { apiRoute } from "@/lib/server/http";
import { authConfig } from "@/lib/server/modules/auth";

export const GET = apiRoute(authConfig);
