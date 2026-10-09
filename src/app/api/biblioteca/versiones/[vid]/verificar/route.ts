import { apiRoute } from "@/lib/server/http";
import { verificarVersion } from "@/lib/server/modules/biblioteca";

export const GET = apiRoute(verificarVersion);
