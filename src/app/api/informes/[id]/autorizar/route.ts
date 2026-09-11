import { apiRoute } from "@/lib/server/http";
import { authorizeInforme } from "@/lib/server/modules/informes";

export const POST = apiRoute(authorizeInforme);
