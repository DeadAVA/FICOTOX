import { apiRoute } from "@/lib/server/http";
import { listAudit } from "@/lib/server/modules/audit";

export const GET = apiRoute(listAudit);
