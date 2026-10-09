import { apiRoute } from "@/lib/server/http";
import { liberarInforme } from "@/lib/server/modules/informes";

export const POST = apiRoute(liberarInforme);
