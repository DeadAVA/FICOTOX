import { apiRoute } from "@/lib/server/http";
import { archivarDocumento } from "@/lib/server/modules/biblioteca";

export const POST = apiRoute(archivarDocumento);
