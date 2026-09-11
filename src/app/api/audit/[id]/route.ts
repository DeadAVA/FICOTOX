import { apiRoute } from "@/lib/server/http";
import { getAuditEntry } from "@/lib/server/modules/audit";

export const GET = apiRoute(getAuditEntry);
