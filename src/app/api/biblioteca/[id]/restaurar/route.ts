import { apiRoute } from "@/lib/server/http";
import { restaurarDocumento } from "@/lib/server/modules/biblioteca";

export const POST = apiRoute(restaurarDocumento);
