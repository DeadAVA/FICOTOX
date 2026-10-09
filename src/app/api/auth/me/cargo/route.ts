import { apiRoute } from "@/lib/server/http";
import { fijarCargoPredeterminado } from "@/lib/server/modules/auth";

export const PUT = apiRoute(fijarCargoPredeterminado);
