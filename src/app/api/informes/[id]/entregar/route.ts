import { apiRoute } from "@/lib/server/http";
import { deliverInforme } from "@/lib/server/modules/informes";

export const POST = apiRoute(deliverInforme);
