import { apiRoute } from "@/lib/server/http";
import { reportableForReception } from "@/lib/server/modules/informes";

export const GET = apiRoute(reportableForReception);
