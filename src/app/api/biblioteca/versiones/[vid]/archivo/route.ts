import { apiRoute } from "@/lib/server/http";
import { archivoVersion } from "@/lib/server/modules/biblioteca";

export const GET = apiRoute(archivoVersion);
