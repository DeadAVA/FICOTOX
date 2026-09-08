import { apiRoute } from "@/lib/server/http";
import { documentsSummary } from "@/lib/server/modules/documents";

export const GET = apiRoute(documentsSummary);
