import { apiRoute } from "@/lib/server/http";
import { liberarRetencion } from "@/lib/server/modules/calidad/nc";

export const POST = apiRoute(liberarRetencion);
