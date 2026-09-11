import { apiRoute } from "@/lib/server/http";
import { verifyAudit } from "@/lib/server/modules/audit";

export const GET = apiRoute(verifyAudit);
