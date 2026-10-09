import { apiRoute } from "@/lib/server/http";
import { subirVersion } from "@/lib/server/modules/biblioteca";

export const POST = apiRoute(subirVersion);
