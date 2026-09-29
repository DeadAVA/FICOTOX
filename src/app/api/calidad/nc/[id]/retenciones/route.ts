import { apiRoute } from "@/lib/server/http";
import { retenerInforme } from "@/lib/server/modules/calidad/nc";

export const POST = apiRoute(retenerInforme);
