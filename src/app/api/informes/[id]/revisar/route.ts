import { apiRoute } from "@/lib/server/http";
import { reviewInforme } from "@/lib/server/modules/informes";

export const POST = apiRoute(reviewInforme);
