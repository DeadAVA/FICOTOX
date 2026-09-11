import { apiRoute } from "@/lib/server/http";
import { auditSummary } from "@/lib/server/modules/audit";

export const GET = apiRoute(auditSummary);
