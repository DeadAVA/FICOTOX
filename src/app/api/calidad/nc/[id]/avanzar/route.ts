import { apiRoute } from "@/lib/server/http";
import { avanzarNc } from "@/lib/server/modules/calidad/nc";

export const POST = apiRoute(avanzarNc);
