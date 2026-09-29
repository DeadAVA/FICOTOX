import { apiRoute } from "@/lib/server/http";
import { implementarAccion } from "@/lib/server/modules/calidad/nc";

export const POST = apiRoute(implementarAccion);
