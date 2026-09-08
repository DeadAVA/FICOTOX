import { apiRoute } from "@/lib/server/http";
import { listPermissions } from "@/lib/server/modules/admin";

export const GET = apiRoute(listPermissions);
