import { apiRoute } from "@/lib/server/http";
import { deleteRole, getRoleDetail, updateRole } from "@/lib/server/modules/admin";

export const GET = apiRoute(getRoleDetail);
export const PUT = apiRoute(updateRole);
export const DELETE = apiRoute(deleteRole);
