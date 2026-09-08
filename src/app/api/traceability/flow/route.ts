import { apiRoute } from "@/lib/server/http";
import { flowStatus } from "@/lib/server/modules/traceability";

export const GET = apiRoute(flowStatus);
