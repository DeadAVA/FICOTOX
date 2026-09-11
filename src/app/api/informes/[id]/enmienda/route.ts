import { apiRoute } from "@/lib/server/http";
import { amendInforme } from "@/lib/server/modules/informes";

export const POST = apiRoute(amendInforme);
