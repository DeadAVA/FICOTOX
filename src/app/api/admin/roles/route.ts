import { apiRoute } from "@/lib/server/http";
import { createRole, listRoles } from "@/lib/server/modules/admin";

export const GET = apiRoute(listRoles);
export const POST = apiRoute(createRole);
