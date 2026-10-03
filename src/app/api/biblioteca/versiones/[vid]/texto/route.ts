import { apiRoute } from "@/lib/server/http";
import { guardarTextoVersion } from "@/lib/server/modules/biblioteca";

export const POST = apiRoute(guardarTextoVersion);
